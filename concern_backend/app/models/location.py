from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    sub_locality = Column(String)
    locality = Column(String)
    city = Column(String)
    admin_area = Column(String)
    state = Column(String)
    country = Column(String)

    # CHANGE MADE HERE:
    # Switched from Enum(...) to String. 
    # You can now store values like "user_text", "inferred", or "manual" directly.
    location_source = Column(String, nullable=False)
    
    location_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    concerns = relationship("Concern", back_populates="location")
    conversations = relationship("Conversation", back_populates="primary_location")