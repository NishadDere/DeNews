from sqlalchemy import text
from app.database import engine, Base

# Import ALL models so SQLAlchemy registers every table
from app.models.location import Location
from app.models.concern import Concern
from app.models.conversation import Conversation
from app.models.message import ConversationMessage
from app.models.user import User
from app.models.cluster import ConcernCluster
from app.models.reporter import ConcernReporter


def reset_database():
    print("🗑️  Dropping tables and types with CASCADE...")

    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS conversation_messages CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS concerns CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS concern_reporters CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS conversations CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS locations CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS concern_clusters CASCADE;"))
        conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))

        conn.execute(text("DROP TYPE IF EXISTS location_source_enum CASCADE;"))
        conn.execute(text("DROP TYPE IF EXISTS concern_status_enum CASCADE;"))
        conn.execute(text("DROP TYPE IF EXISTS event_time_source_enum CASCADE;"))
        conn.execute(text("DROP TYPE IF EXISTS cluster_status_enum CASCADE;"))

        conn.commit()

    print("✅ Old data wiped.")

    print("🔌 Enabling pgvector extension...")
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
    print("✅ pgvector enabled.")

    print("🔨 Recreating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!")


if __name__ == "__main__":
    reset_database()