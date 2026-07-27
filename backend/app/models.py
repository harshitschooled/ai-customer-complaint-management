import uuid
from sqlalchemy import Column, String, Integer, Date, Text, DateTime
from datetime import datetime
from app.database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    
    # 13 Required Fields
    complaint_source = Column(String, nullable=True) # Email, Web, Phone, Portal, etc.
    customer_name = Column(String, nullable=True)
    product_name = Column(String, nullable=True)
    product_strength = Column(String, nullable=True)
    batch_number = Column(String, nullable=True)
    manufacturing_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    quantity_affected = Column(Integer, nullable=True)
    complaint_type = Column(String, nullable=True) # Efficacy, Adverse Event, Packaging, etc.
    complaint_date = Column(Date, nullable=True)
    complaint_description = Column(Text, nullable=True)
    severity = Column(String, nullable=True) # Low, Medium, High, Critical
    priority = Column(String, nullable=True) # Low, Medium, High, Urgent
    
    # AI-Generated Insights
    ai_summary = Column(Text, nullable=True)
    risk_classification = Column(Text, nullable=True)
    root_cause_recommendation = Column(Text, nullable=True)
    capa_recommendation = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
