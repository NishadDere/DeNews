from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import get_db
from . import crud, schemas
from .services.llm_extractor import extract_concern_from_text
from .services.storage import upload_photo, ALLOWED, MAX_BYTES
from typing import List
from uuid import UUID

# ✅ 1. Create the FastAPI app instance FIRST
app = FastAPI(title="NagarVaani Core Backend", version="2.0.0")

# ✅ 2. Add CORS middleware AFTER app is defined
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # For development only – restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── PHOTO UPLOAD ──────────────────────────────────────────────────────────────
@app.post("/uploads")
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG or WebP images are allowed")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 5 MB")
    try:
        url = upload_photo(data, file.content_type)
    except Exception as e:
        print(f"[uploads] failed: {e}")
        raise HTTPException(status_code=500, detail="Photo upload failed")
    return {"photo_url": url}

# ── CREATE CONCERN ────────────────────────────────────────────────────────────
@app.post("/concerns")
def create_concern(data: schemas.ConcernCreate, db: Session = Depends(get_db)):
    print(f"🤖 Analyzing concern: {data.description}")
    extraction = None

    try:
        extraction = extract_concern_from_text(data.description, language=data.language)
        print(f"✅ AI Extracted: {extraction.what}")
        print(f"📍 Location: {extraction.location.locality}, {extraction.location.city}")
        print(f"⚡ Urgency score: {extraction.urgency_score}")
    except Exception as e:
        print(f"⚠️ AI Extraction failed: {e}")

    try:
        concern, conversation, cluster, is_duplicate, duplicate_count = crud.create_concern(
            db, data, extraction
        )
    except crud.LocationNotFound:
        if extraction is None:
            raise HTTPException(
                status_code=503,
                detail="Our AI service is busy right now. Please try again in a moment, or drop a pin on the map.",
            )
        raise HTTPException(
            status_code=422,
            detail="We couldn't work out where this is. Mention the area in your description or drop a pin on the map.",
        )

    # HITL flag: confidence below threshold
    hitl_flagged = (extraction.confidence < 0.85) if extraction else True

    return {
    "concern_id":      str(concern.id),
    "conversation_id": str(conversation.id),
    "cluster_id":      str(cluster.id),
    "status":          concern.status.value if hasattr(concern.status, "value") else str(concern.status),
    "is_duplicate":    is_duplicate,
    "duplicate_count": duplicate_count,
    "hitl_flagged":    concern.hitl_flagged,
    "confidence":      concern.confidence,
    "ai_summary":      extraction.what if extraction else "Not available",
    "is_urgent":       concern.is_urgent,
}

# ── STATUS CHECK (for WhatsApp "My Concerns") ────────────────────────────────
@app.get("/concerns/status")
def get_concerns_status(
    ids: str = Query(..., description="Comma-separated concern IDs"),
    db: Session = Depends(get_db),
):
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if not id_list:
        raise HTTPException(status_code=400, detail="No IDs provided")

    concerns = crud.get_concerns_by_ids(db, id_list)

    return [
        {
            "concern_id": str(c.id),
            "status":     str(c.status),
            "issue_type": c.issue_type,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in concerns
    ]

# ── RESOLUTION — notify all reporters ────────────────────────────────────────
@app.post("/concerns/{concern_id}/resolve")
def resolve_concern(
    concern_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
):
    concern = crud.get_concern_by_id(db, concern_id)
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")

    concern.status = "RESOLVED"
    db.commit()
    db.refresh(concern)

    reporters = crud.get_all_reporters_for_cluster(db, concern.cluster_id)

    return {
        "concern_id":     str(concern.id),
        "status":         "RESOLVED",
        "reporter_count": len(reporters),
        "reporters":      reporters,
    }

# ── EXISTING ENDPOINTS (unchanged) ───────────────────────────────────────────
@app.post("/conversations/{conversation_id}/messages")
def post_message(
    conversation_id: str,
    data: schemas.MessageCreate,
    db: Session = Depends(get_db),
):
    msg = crud.add_message(db, conversation_id, data.content)
    return {"message_id": msg.id}

@app.get("/concerns", response_model=List[schemas.Concern])
def read_concerns(
    status: str | None = Query(None),
    days:   int | None = Query(None),
    db: Session = Depends(get_db),
):
    return crud.get_concerns(db, status=status, days=days)

@app.get("/concerns/{concern_id}", response_model=schemas.ConcernDetail)
def read_concern(concern_id: UUID, db: Session = Depends(get_db)):
    concern = crud.get_concern_by_id(db, concern_id)
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")
    return concern

@app.get("/conversations/{conversation_id}", response_model=schemas.Conversation)
def read_conversation(conversation_id: UUID, db: Session = Depends(get_db)):
    conversation = crud.get_conversation_by_id(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

# ── CLUSTER ENDPOINTS ─────────────────────────────────────────────────────────
@app.get("/clusters", response_model=List[schemas.ClusterSummary])
def read_clusters(
    issue_type: str | None = Query(None),
    status:     str | None = Query(None),
    db: Session = Depends(get_db),
):
    return crud.get_all_clusters(db, issue_type=issue_type, status=status)

@app.get("/clusters/{cluster_id}", response_model=schemas.ClusterDetail)
def read_cluster(cluster_id: UUID, db: Session = Depends(get_db)):
    cluster = crud.get_cluster_by_id(db, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    return cluster

# ── HITL: APPROVE CONCERN ─────────────────────────────────────────────────────
@app.post("/concerns/{concern_id}/approve")
def approve_concern(concern_id: UUID, db: Session = Depends(get_db)):
    concern = crud.get_concern_by_id(db, concern_id)
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")

    concern.hitl_flagged = False
    concern.status = "NEW"
    db.commit()
    db.refresh(concern)

    return {
        "concern_id": str(concern.id),
        "status":     "approved",
        "new_status": "NEW"
    }


# ── HITL: REJECT CONCERN ──────────────────────────────────────────────────────
@app.post("/concerns/{concern_id}/reject")
def reject_concern(concern_id: UUID, db: Session = Depends(get_db)):
    concern = crud.get_concern_by_id(db, concern_id)
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")

    concern.status = "CLOSED"
    db.commit()
    db.refresh(concern)

    return {
        "concern_id": str(concern.id),
        "status":     "rejected",
        "new_status": "CLOSED"
    }