from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from .enums import ConversationStatus
from sqlalchemy import Enum as PgEnum
import uuid

from app.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    status = Column(PgEnum(ConversationStatus), nullable=False, default=ConversationStatus.active)
    resolved_at = Column(DateTime, nullable=True)

    issue_type = Column(String, nullable=False)

    primary_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("locations.id"),
        nullable=False
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    primary_location = relationship("Location", back_populates="conversations")
    concerns = relationship("Concern", back_populates="conversation")
    messages = relationship("ConversationMessage", back_populates="conversation")
