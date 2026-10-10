from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as PgEnum
from datetime import datetime
import uuid

from app.database import Base
from app.models.enums import ClusterStatus


class ConcernCluster(Base):
    __tablename__ = "concern_clusters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Cluster identity
    issue_type = Column(String, nullable=True)
    location_label = Column(String, nullable=True)
    centroid_lat = Column(Float, nullable=True)
    centroid_lng = Column(Float, nullable=True)

    # Aggregated intelligence
    report_count = Column(Integer, default=1, nullable=False)
    severity_score = Column(Float, nullable=True)
    first_reported_at = Column(DateTime, default=datetime.utcnow)
    last_reported_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Summary outputs
    news_brief = Column(Text, nullable=True)
    gov_report = Column(Text, nullable=True)
    summary_last_updated = Column(DateTime, nullable=True)

    # Status
    status = Column(
        PgEnum(ClusterStatus, name="cluster_status_enum"),
        default=ClusterStatus.open,
        nullable=False
    )
    escalated_to_gov = Column(Boolean, default=False, nullable=False)

    # Relations — will be added once concern.py gets cluster_id FK
    concerns = relationship("Concern", back_populates="cluster")