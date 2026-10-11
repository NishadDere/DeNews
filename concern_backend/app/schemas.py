from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# ==========================================
# 1. INPUT SCHEMAS (Data sent to API)
# ==========================================

class ConcernCreate(BaseModel):
    # Core — always required
    description: str

    # WhatsApp / NagarVaani fields — all optional for backward compatibility
    category:         Optional[str]   = None   # from bot category menu
    latitude:         Optional[float] = None
    longitude:        Optional[float] = None
    address:          Optional[str]   = None
    location_source:  Optional[str]   = None   # "photo" | "pin" | "manual"
    photo_media_id:   Optional[str]   = None   # Meta media ID
    photo_url:        Optional[str]   = None
    cause:            Optional[str]   = None
    solution:         Optional[str]   = None
    is_urgent:        Optional[bool]  = False

    # Reporter identity — stored internally only, never exposed
    reporter_phone:    Optional[str]  = None
    reporter_name:     Optional[str]  = None
    language:          Optional[str]  = "en"   # "en" | "hi" | "mr"


class MessageCreate(BaseModel):
    content: str


# ==========================================
# 2. OUTPUT SCHEMAS (Data returned from API)
# ==========================================

class Message(BaseModel):
    id: UUID
    author_id: UUID
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Conversation(BaseModel):
    id: UUID
    concern_id: UUID
    messages: List[Message] = []

    model_config = ConfigDict(from_attributes=True)


class ConcernLocation(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    locality: Optional[str] = None
    city: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Concern(BaseModel):
    id: UUID
    description: str
    status: str
    created_at: datetime
    issue_type: Optional[str] = None
    is_urgent: bool = False
    hitl_flagged: bool = False
    confidence: Optional[float] = None
    cluster_id: Optional[UUID] = None
    photo_url: Optional[str] = None 
    location: Optional[ConcernLocation] = None

    model_config = ConfigDict(from_attributes=True)


class ConcernDetail(Concern):
    conversation: Optional[Conversation] = None


# ==========================================
# 3. INTERNAL SCHEMAS (For AI Service)
# ==========================================

class ExtractedLocation(BaseModel):
    sub_locality: Optional[str] = None
    locality:     Optional[str] = None
    city:         Optional[str] = None
    state:        Optional[str] = None
    country:      Optional[str] = None


class ExtractedConcern(BaseModel):
    what:                          str
    location:                      ExtractedLocation
    time_hint:                     Optional[str]      = None
    estimated_incident_timestamp:  Optional[datetime] = None
    confidence:                    float
    urgency_score:                 Optional[float]    = None   # NEW: 0.0–1.0


# ==========================================
# 4. CLUSTER SCHEMAS
# ==========================================

class ClusterSummary(BaseModel):
    id:               UUID
    issue_type:       Optional[str]
    location_label:   Optional[str]
    report_count:     int
    severity_score:   Optional[float]
    status:           str
    first_reported_at: Optional[datetime]
    last_reported_at:  Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ClusterDetail(ClusterSummary):
    news_brief:      Optional[str]   = None
    gov_report:      Optional[str]   = None
    centroid_lat:    Optional[float] = None
    centroid_lng:    Optional[float] = None
    escalated_to_gov: bool           = False

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 5. WHATSAPP STATUS CHECK SCHEMA
# ==========================================

class ConcernStatusItem(BaseModel):
    concern_id: str
    status:     str
    issue_type: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
