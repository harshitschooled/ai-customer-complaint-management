import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.config import settings

DATABASE_URL = settings.DATABASE_URL
engine = None
SessionLocal = None

try:
    # Try connecting to PostgreSQL
    if DATABASE_URL.startswith("postgresql"):
        logger.info(f"Attempting to connect to PostgreSQL at: {DATABASE_URL.split('@')[-1]}")
        # Add connect timeout to fail fast if DB is down
        engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 5})
        # Test connection
        with engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL database.")
    else:
        # SQLite or other URL
        engine = create_engine(DATABASE_URL)
except Exception as e:
    logger.warning(f"Failed to connect to PostgreSQL ({e}). Falling back to local SQLite database.")
    DATABASE_URL = "sqlite:///./complaints.db"
    # SQLite requires check_same_thread=False for multi-threading in FastAPI
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
