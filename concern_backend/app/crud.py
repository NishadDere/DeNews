from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from geopy.distance import geodesic
import uuid

from app.models.location import Location
from app.models.conversation import Conversation
from app.models.concern import Concern
from app.models.message import ConversationMessage
from app.models.user import User
from app.models.cluster import ConcernCluster
from app.models.reporter import ConcernReporter
from app.models.enums import ClusterStatus
from app.services.embedding import generate_embedding, cosine_similarity   # NEW
from app.services.geocoding import get_coordinates

TEST_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")

CLUSTER_RADIUS_KM    = 0.15    # 150m — accounts for WhatsApp location imprecision
SIMILARITY_THRESHOLD = 0.85    # cosine similarity threshold for semantic match


# ── HELPERS ───────────────────────────────────────────────────────────────────

def get_or_create_test_user(db: Session):
    user = db.query(User).filter(User.id == TEST_USER_ID).first()
    if not user:
        user = User(
            id=TEST_USER_ID,
            display_name="Test User",
            role="citizen"
        )
        db.add(user)
        db.commit()
    return user


# ── SEMANTIC + SPATIAL CLUSTER MATCHING ──────────────────────────────────────

def find_matching_cluster(
    db: Session,
    lat: float,
    lng: float,
    new_embedding: list[float],
) -> ConcernCluster | None:
    """
    Finds a matching open cluster using a two-stage filter:

    Stage 1 — Spatial: find all clusters whose centroid is within 150m.
              No issue_type filter — we let semantics decide the match.

    Stage 2 — Semantic: for each nearby cluster, fetch its most recent
              concern's embedding and compute cosine similarity.
              If similarity > 0.85, it's a match.

    Returns the cluster with the highest semantic similarity, or None.

    This correctly matches:
      "broken road near bus stop"  ↔  "huge pothole outside Swargate"
      "no water since yesterday"   ↔  "water supply cut for 2 days"
    """
    # Stage 1: spatial filter
    all_open_clusters = db.query(ConcernCluster).filter(
        ConcernCluster.status == ClusterStatus.open,
        ConcernCluster.centroid_lat.isnot(None),
        ConcernCluster.centroid_lng.isnot(None),
    ).all()

    nearby_clusters = []
    for cluster in all_open_clusters:
        distance_km = geodesic(
            (lat, lng),
            (cluster.centroid_lat, cluster.centroid_lng)
        ).km
        if distance_km <= CLUSTER_RADIUS_KM:
            nearby_clusters.append((cluster, distance_km))

    if not nearby_clusters:
        return None

    # Stage 2: semantic filter
    best_cluster    = None
    best_similarity = 0.0

    for cluster, distance_km in nearby_clusters:
        # Get the most recent concern in this cluster that has an embedding
        representative = (
            db.query(Concern)
            .filter(
                Concern.cluster_id == cluster.id,
                Concern.embedding.isnot(None),
            )
            .order_by(Concern.created_at.desc())
            .first()
        )

        if representative is None or representative.embedding is None:
            # Cluster has no embeddings yet — fall back to spatial-only match
            # (handles legacy concerns created before embeddings were added)
            if distance_km < CLUSTER_RADIUS_KM * 0.5:   # only if very close (<75m)
                if best_similarity < 0.5:                # lower bar for legacy
                    best_cluster    = cluster
                    best_similarity = 0.5
            continue

        similarity = cosine_similarity(new_embedding, list(representative.embedding))
        print(f"[clustering] cluster {cluster.id} | dist={distance_km*1000:.0f}m | sim={similarity:.3f}")

        if similarity >= SIMILARITY_THRESHOLD and similarity > best_similarity:
            best_similarity = similarity
            best_cluster    = cluster

    if best_cluster:
        print(f"[clustering] ✅ matched cluster {best_cluster.id} (sim={best_similarity:.3f})")
    else:
        print(f"[clustering] 🆕 no semantic match found — new cluster")

    return best_cluster


# ── CLUSTER WRITE OPERATIONS ──────────────────────────────────────────────────

def create_new_cluster(db: Session, issue_type: str, location_label: str,
                       lat: float, lng: float, severity_score: float):
    cluster = ConcernCluster(
        issue_type=issue_type,
        location_label=location_label,
        centroid_lat=lat,
        centroid_lng=lng,
        report_count=1,
        severity_score=severity_score,
        first_reported_at=datetime.utcnow(),
        last_reported_at=datetime.utcnow(),
        status=ClusterStatus.open,
        escalated_to_gov=False,
    )
    db.add(cluster)
    db.commit()
    db.refresh(cluster)
    return cluster


def update_cluster_on_new_report(db: Session, cluster: ConcernCluster,
                                  lat: float, lng: float, severity_score: float):
    n = cluster.report_count

    cluster.centroid_lat = ((cluster.centroid_lat * n) + lat) / (n + 1)
    cluster.centroid_lng = ((cluster.centroid_lng * n) + lng) / (n + 1)

    if cluster.severity_score is not None:
        cluster.severity_score = ((cluster.severity_score * n) + severity_score) / (n + 1)
    else:
        cluster.severity_score = severity_score

    cluster.report_count    = n + 1
    cluster.last_reported_at = datetime.utcnow()

    db.commit()
    db.refresh(cluster)
    return cluster


# ── REPORTER TRACKING ─────────────────────────────────────────────────────────

def add_reporter(db: Session, concern_id: uuid.UUID, phone: str, name: str | None):
    reporter = ConcernReporter(
        concern_id=concern_id,
        reporter_phone=phone,
        reporter_name=name,
    )
    db.add(reporter)
    db.commit()


def get_reporters_for_concern(db: Session, concern_id: uuid.UUID) -> list[str]:
    reporters = db.query(ConcernReporter).filter(
        ConcernReporter.concern_id == concern_id
    ).all()
    return [r.reporter_phone for r in reporters]


def get_reporter_count(db: Session, cluster_id: uuid.UUID) -> int:
    concern_ids = db.query(Concern.id).filter(
        Concern.cluster_id == cluster_id
    ).subquery()
    return db.query(ConcernReporter).filter(
        ConcernReporter.concern_id.in_(concern_ids)
    ).count()


# ── CREATE CONCERN ────────────────────────────────────────────────────────────

def create_concern(db: Session, data, extraction=None):
    """
    Full pipeline:
    1. Resolve coordinates
    2. Generate semantic embedding
    3. Create location
    4. Spatial + semantic cluster matching
    5. Create conversation + concern
    6. Track reporter
    """
    get_or_create_test_user(db)

    # 1. RESOLVE COORDINATES
    lat = data.latitude  if (hasattr(data, "latitude")  and data.latitude  is not None) else None
    lng = data.longitude if (hasattr(data, "longitude") and data.longitude is not None) else None

    if lat is None or lng is None:
       location_text = None
    if extraction and extraction.location:
        location_text = ", ".join(filter(None, [
            extraction.location.locality, extraction.location.city
        ]))
    if location_text:
        geo_lat, geo_lng = get_coordinates(location_text)
        lat, lng = geo_lat or 0.0, geo_lng or 0.0
    else:
        lat, lng = 0.0, 0.0
    
    print(f"[crud] coords used: lat={lat}, lng={lng}, provided={data.latitude is not None}, source={getattr(data, 'location_source', None)}")
    
    # 2. GENERATE EMBEDDING
    # Embed the description so we can semantically match future reports
    embedding = None
    try:
        embedding = generate_embedding(data.description)
        print(f"[crud] ✅ embedding generated ({len(embedding)} dims)")
    except Exception as e:
        print(f"[crud] ⚠️ embedding failed, will skip semantic matching: {e}")

    # 3. CREATE LOCATION
    new_location = Location(
        latitude=lat,
        longitude=lng,
        sub_locality=extraction.location.sub_locality if extraction and extraction.location else None,
        locality=extraction.location.locality         if extraction and extraction.location else None,
        city=extraction.location.city                 if extraction and extraction.location else None,
        state=extraction.location.state               if extraction and extraction.location else None,
        country=extraction.location.country           if extraction and extraction.location else None,
        location_source=(
            data.location_source.upper()
            if hasattr(data, "location_source") and data.location_source
            else ("AI_EXTRACTED" if extraction else "USER_TEXT")
        ),
        location_verified=False,
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    # 4. RESOLVE METADATA
    issue_type = (
        data.category
        if hasattr(data, "category") and data.category
        else (extraction.what if extraction else "General")
    )
    confidence = extraction.confidence if extraction else 0.0

    location_label = (
        extraction.location.locality or
        extraction.location.sub_locality or
        extraction.location.city or
        "Unknown"
    ) if extraction and extraction.location else (
        data.address if hasattr(data, "address") and data.address else "Unknown"
    )

    # 5. URGENCY
    user_urgent   = bool(data.is_urgent) if hasattr(data, "is_urgent") and data.is_urgent else False
    ai_urgency    = extraction.urgency_score if extraction and extraction.urgency_score else 0.0
    is_urgent     = user_urgent or (ai_urgency > 0.7)
    urgency_score = max(1.0 if user_urgent else 0.0, ai_urgency)

    # 6. CLUSTER MATCHING — spatial + semantic
    if embedding:
        existing_cluster = find_matching_cluster(db, lat, lng, embedding)
    else:
        # Embedding failed — fall back to old spatial-only + issue_type match
        print("[crud] ⚠️ falling back to spatial-only clustering")
        existing_cluster = _find_cluster_spatial_only(db, issue_type, lat, lng)

    if existing_cluster:
        cluster      = update_cluster_on_new_report(db, existing_cluster, lat, lng, urgency_score)
        is_duplicate = True
    else:
        cluster      = create_new_cluster(db, issue_type, location_label, lat, lng, urgency_score)
        is_duplicate = False

    # 7. CREATE CONVERSATION
    new_conversation = Conversation(
        status="ACTIVE",
        issue_type=issue_type,
        primary_location_id=new_location.id,
    )
    db.add(new_conversation)
    db.commit()
    db.refresh(new_conversation)

    # 8. CREATE CONCERN
    new_concern = Concern(
        description=data.description,
        user_id=TEST_USER_ID,
        location_id=new_location.id,
        location_confidence=confidence,
        confidence=confidence,
        hitl_flagged=(confidence < 0.85) if extraction else True,
        conversation_id=new_conversation.id,
        issue_type=issue_type,
        event_time=extraction.estimated_incident_timestamp if extraction else None,
        status="NEW",
        cluster_id=cluster.id,
        parent_concern_id=(
            cluster.concerns[0].id
            if is_duplicate and cluster.concerns else None
        ),
        embedding=embedding,                              # NEW — store vector
        location_source=(data.location_source if hasattr(data, "location_source") else None),
        photo_media_id=(data.photo_media_id   if hasattr(data, "photo_media_id")  else None),
        photo_url=(data.photo_url             if hasattr(data, "photo_url")       else None),
        is_urgent=is_urgent,
        urgency_score=urgency_score,
        cause=(data.cause       if hasattr(data, "cause")       else None),
        solution=(data.solution if hasattr(data, "solution")    else None),
        reporter_phone=(data.reporter_phone if hasattr(data, "reporter_phone") else None),
        reporter_name=(data.reporter_name   if hasattr(data, "reporter_name")  else None),
        reporter_language=(data.language    if hasattr(data, "language")       else "en"),
    )
    db.add(new_concern)
    db.commit()
    db.refresh(new_concern)

    # 9. TRACK REPORTER
    if hasattr(data, "reporter_phone") and data.reporter_phone:
        add_reporter(db, new_concern.id, data.reporter_phone, data.reporter_name)

    # 10. DUPLICATE COUNT
    duplicate_count = get_reporter_count(db, cluster.id) - 1 if is_duplicate else 0

    return new_concern, new_conversation, cluster, is_duplicate, duplicate_count


def _find_cluster_spatial_only(db: Session, issue_type: str, lat: float, lng: float):
    """Fallback: original spatial + issue_type match. Used when embedding fails."""
    candidates = db.query(ConcernCluster).filter(
        ConcernCluster.issue_type == issue_type,
        ConcernCluster.status == ClusterStatus.open,
    ).all()
    closest, closest_dist = None, float("inf")
    for cluster in candidates:
        if cluster.centroid_lat is None:
            continue
        d = geodesic((lat, lng), (cluster.centroid_lat, cluster.centroid_lng)).km
        if d <= CLUSTER_RADIUS_KM and d < closest_dist:
            closest, closest_dist = cluster, d
    return closest


# ── READ OPERATIONS (unchanged) ───────────────────────────────────────────────

def add_message(db: Session, conversation_id, content):
    msg = ConversationMessage(
        conversation_id=conversation_id,
        user_id=TEST_USER_ID,
        message=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_concerns(db: Session, status: str | None = None, days: int | None = None):
    query = db.query(Concern)
    if status:
        query = query.filter(Concern.status == status)
    if days:
        since = datetime.utcnow() - timedelta(days=days)
        query = query.filter(Concern.created_at >= since)
    return query.order_by(Concern.created_at.desc()).all()


def get_concern_by_id(db: Session, concern_id):
    return db.query(Concern).filter(Concern.id == concern_id).first()


def get_conversation_by_id(db: Session, conversation_id):
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()


def get_cluster_by_id(db: Session, cluster_id):
    return db.query(ConcernCluster).filter(ConcernCluster.id == cluster_id).first()


def get_all_clusters(db: Session, issue_type: str | None = None, status: str | None = None):
    query = db.query(ConcernCluster)
    if issue_type:
        query = query.filter(ConcernCluster.issue_type == issue_type)
    if status:
        query = query.filter(ConcernCluster.status == status)
    return query.order_by(ConcernCluster.last_reported_at.desc()).all()


def get_concerns_by_ids(db: Session, concern_ids: list[str]) -> list[Concern]:
    return db.query(Concern).filter(Concern.id.in_(concern_ids)).all()


def get_all_reporters_for_cluster(db: Session, cluster_id: uuid.UUID) -> list[dict]:
    concern_ids = [
        c.id for c in db.query(Concern.id).filter(Concern.cluster_id == cluster_id).all()
    ]
    reporters = db.query(ConcernReporter).filter(
        ConcernReporter.concern_id.in_(concern_ids)
    ).all()
    return [{"phone": r.reporter_phone, "name": r.reporter_name} for r in reporters]