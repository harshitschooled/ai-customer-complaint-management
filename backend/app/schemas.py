from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List

# Base class for Shared Fields
class ComplaintBase(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    quantity_affected: Optional[int] = None
    complaint_type: Optional[str] = None
    complaint_date: Optional[date] = None
    complaint_description: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    
    # AI insights
    ai_summary: Optional[str] = None
    risk_classification: Optional[str] = None
    root_cause_recommendation: Optional[str] = None
    capa_recommendation: Optional[str] = None

# Schema for Creating a Complaint
class ComplaintCreate(ComplaintBase):
    pass

# Schema for Returning a Complaint (includes DB fields)
class ComplaintResponse(ComplaintBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema for AI Extraction Request
class ExtractRequest(BaseModel):
    text: str

# Schema for AI Copilot Chat Request
class ChatRequest(BaseModel):
    complaint_id: Optional[str] = None
    message: str
    history: Optional[List[dict]] = None # Previous messages: [{"role": "user"/"assistant", "content": "..."}]
    context: Optional[str] = None # Intake document context

# Schema for AI Copilot Chat Response
class ChatResponse(BaseModel):
    response: str
    history: List[dict]
