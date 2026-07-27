import os
from dotenv import load_dotenv

# Load environment variables from .env if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = "AI-Powered Customer Complaint Management System"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/complaint_db"
    )
    
    # AI Config
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = "gemma2-9b-it"

settings = Settings()
