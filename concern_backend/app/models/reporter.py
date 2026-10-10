"""
Reporter model — maps phone numbers to concerns they reported.
Used to:
- Send WhatsApp resolution notifications to all reporters of a concern
- Count how many unique users reported the same concern (credibility metric)
Phone numbers are NEVER exposed publicly — internal use only.
"""
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class ConcernReporter(Base):
    __tablename__ = "concern_reporters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    concern_id = Column(
        UUID(as_uuid=True),
        ForeignKey("concerns.id"),
        nullable=False,
        index=True,
    )

    # Stored internally only — never surfaced via API or website
    reporter_phone = Column(String, nullable=False)
    reporter_name  = Column(String, nullable=True)

    reported_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to concern
    concern = relationship("Concern", backref="reporters")
