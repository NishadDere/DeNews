import enum

class UserRole(str, enum.Enum):
    citizen = "citizen"
    authority = "authority"
    admin = "admin"

class ConcernStatus(str, enum.Enum):
    new = "NEW"
    active = "ACTIVE"
    pending = "PENDING"
    resolved = "RESOLVED"
    closed = "CLOSED"

class ConversationStatus(str, enum.Enum):
    active = "ACTIVE"
    resolved = "RESOLVED"

class EventTimeSource(str, enum.Enum):
    inferred = "inferred"
    explicit = "explicit"

class LocationSource(str, enum.Enum):
    user_text = "user_text"
    inferred = "inferred"
    manual = "manual"

class ClusterStatus(str, enum.Enum):
    open = "OPEN"
    acknowledged = "ACKNOWLEDGED"
    resolved = "RESOLVED"