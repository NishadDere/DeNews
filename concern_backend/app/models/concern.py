from sqlalchemy import Column, String, DateTime, ForeignKey, Float, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from sqlalchemy import Enum as PgEnum
from .enums import ConcernStatus, EventTimeSource
from pgvector.sqlalchemy import Vector                  # NEW

from app.database import Base
from app.services.embedding import EMBEDDING_DIM        # NEW — 768


class Concern(Base):
    __tablename__ = "concerns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id"),
        nullable=True
    )

    parent_concern_id = Column(
        UUID(as_uuid=True),
        ForeignKey("concerns.id"),
        nullable=True
    )

    cluster_id = Column(
        UUID(as_uuid=True),
        ForeignKey("concern_clusters.id"),
        nullable=True
    )

    description       = Column(String, nullable=False)
    issue_type        = Column(String)
    event_time        = Column(DateTime)
    event_time_source = Column(PgEnum(EventTimeSource, name="event_time_source_enum"), nullable=True)

    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id"),
        nullable=False
    )
    location_confidence = Column(Float)

    status          = Column(PgEnum(ConcernStatus, name="concern_status_enum"), default=ConcernStatus.new, nullable=False)
    clubbing_reason = Column(JSON)
    created_at      = Column(DateTime, default=datetime.utcnow)

    # ── Semantic embedding (pgvector) ─────────────────────────────────────────
    # 768-dimensional vector of the concern description
    # Used for semantic similarity matching during deduplication
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)   # NEW

    # ── WhatsApp / NagarVaani fields ──────────────────────────────────────────
    location_source  = Column(String, nullable=True)
    photo_media_id   = Column(String, nullable=True)
    photo_url        = Column(String, nullable=True) 
    is_urgent        = Column(Boolean, default=False, nullable=False)
    urgency_score    = Column(Float, nullable=True)
    confidence       = Column(Float, nullable=True)
    hitl_flagged     = Column(Boolean, default=False, nullable=False)
    cause            = Column(String, nullable=True)
    solution         = Column(String, nullable=True)
    reporter_phone   = Column(String, nullable=True)
    reporter_name    = Column(String, nullable=True)
    reporter_language = Column(String, nullable=True)

    # Relationships
    user           = relationship("User", back_populates="concerns")
    conversation   = relationship("Conversation", back_populates="concerns")
    location       = relationship("Location", back_populates="concerns")
    parent_concern = relationship("Concern", remote_side=[id])
    cluster        = relationship("ConcernCluster", back_populates="concerns")