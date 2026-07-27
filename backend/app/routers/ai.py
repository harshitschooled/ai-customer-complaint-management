import os
import re
import logging
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.database import get_db
from app.models import Complaint as DBComplaint
from app.schemas import ExtractRequest, ChatRequest, ChatResponse
from app.ai_engine.graph import run_complaint_pipeline, groq_client
from app.ai_engine.prompts import COPILOT_CHAT_SYSTEM_PROMPT
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai",
    tags=["AI Copilot"]
)

# Text extraction from uploaded file (PDF / DOCX)
@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename.lower()
    text = ""
    
    try:
        if filename.endswith(".pdf"):
            from pypdf import PdfReader
            # Read PDF content
            pdf_reader = PdfReader(file.file)
            for page in pdf_reader.pages:
                text += page.extract_text() or ""
                
        elif filename.endswith(".docx"):
            import docx2txt
            # docx2txt reads from file paths. Write to temporary file.
            with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp_file:
                content = await file.read()
                temp_file.write(content)
                temp_path = temp_file.name
                
            try:
                text = docx2txt.process(temp_path)
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload a PDF or DOCX file."
            )
            
        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The uploaded document contains no readable text."
            )
            
        return {"filename": file.filename, "text": text}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing document {file.filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing the document: {str(e)}"
        )

# Form extraction using LangGraph
@router.post("/extract")
def extract_fields(request: ExtractRequest):
    if not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Intake text cannot be empty."
        )
    result = run_complaint_pipeline(request.text)
    return result

# Chat Copilot
@router.post("/chat", response_model=ChatResponse)
def copilot_chat(request: ChatRequest, db: Session = Depends(get_db)):
    context = ""
    
    # 1. Compile context
    if request.complaint_id:
        db_complaint = db.query(DBComplaint).filter(DBComplaint.id == request.complaint_id).first()
        if db_complaint:
            context += f"COMPLAINT DETAILS:\n"
            context += f"- Customer: {db_complaint.customer_name}\n"
            context += f"- Product: {db_complaint.product_name} {db_complaint.product_strength or ''}\n"
            context += f"- Batch Number: {db_complaint.batch_number}\n"
            context += f"- Severity: {db_complaint.severity}\n"
            context += f"- Priority: {db_complaint.priority}\n"
            context += f"- Complaint Description: {db_complaint.complaint_description}\n"
            if db_complaint.ai_summary:
                context += f"- Summary: {db_complaint.ai_summary}\n"
            if db_complaint.risk_classification:
                context += f"- Risk Assessment: {db_complaint.risk_classification}\n"
            if db_complaint.root_cause_recommendation:
                context += f"- Suggested Root Cause: {db_complaint.root_cause_recommendation}\n"
            if db_complaint.capa_recommendation:
                context += f"- Recommended CAPA: {db_complaint.capa_recommendation}\n"
                
    if request.context:
        context += f"\nADDITIONAL INTAKE DOCUMENT TEXT:\n{request.context}"
        
    if not context:
        context = "No specific complaint context provided. Answer as a general pharmaceutical QA assistant."

    # 2. Build history
    history = request.history or []
    user_msg = request.message
    
    # 3. Call Groq if configured, otherwise run mock assistant
    response_text = ""
    if groq_client:
        try:
            # Build messages list
            messages = [
                {"role": "system", "content": COPILOT_CHAT_SYSTEM_PROMPT.format(context=context)}
            ]
            # Add history
            for msg in history[-8:]: # limit history to last 8 messages to save context tokens
                messages.append({"role": msg["role"], "content": msg["content"]})
            # Add user message
            messages.append({"role": "user", "content": user_msg})
            
            response = groq_client.chat.completions.create(
                messages=messages,
                model=settings.GROQ_MODEL,
                temperature=0.3,
                max_tokens=600
            )
            response_text = response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in chat completion: {e}")
            response_text = f"My apologies. I encountered an error communicating with the AI service: {e}. Let me fall back to local guidance."

    # Fallback to local QA rules if Groq not setup/errored
    if not response_text:
        response_text = get_mock_chat_response(user_msg, context)
        
    # Append to history and return
    history.append({"role": "user", "content": user_msg})
    history.append({"role": "assistant", "content": response_text})
    
    return ChatResponse(response=response_text, history=history)

def get_mock_chat_response(query: str, context: str) -> str:
    """Provides smart mock answers to common QA copilot queries."""
    query_lower = query.lower()
    
    # Extract some context variables for personalization
    prod_match = re.search(r"Product:\s*([^\n]+)", context)
    batch_match = re.search(r"Batch Number:\s*([^\n]+)", context)
    severity_match = re.search(r"Severity:\s*([^\n]+)", context)
    
    prod = prod_match.group(1).strip() if prod_match else "the product"
    batch = batch_match.group(1).strip() if batch_match else "unknown batch"
    severity = severity_match.group(1).strip() if severity_match else "Medium"
    
    if "root cause" in query_lower:
        return f"Regarding **{prod}** (Batch **{batch}**), standard investigation protocols suggest checking: \n1. Equipment log files for the compaction or packaging lines on the specific date of manufacture.\n2. Ambient relative humidity records, especially if the product is moisture-sensitive.\n3. Operator training logs to verify if personnel signed off on the line setup sheet."
        
    elif "capa" in query_lower or "preventive" in query_lower or "corrective" in query_lower:
        return f"For this complaint on **{prod}**, the recommended CAPA actions include: \n1. **Quarantine**: Immediately flag and isolate all remaining stock of batch **{batch}** in the warehouse.\n2. **Retention Sample Review**: Fetch and inspect the reference sample for batch **{batch}** kept in the QA retention library.\n3. **Equipment Adjustments**: Audit the packaging line or dosing nozzles to ensure they comply with specifications."
        
    elif "severity" in query_lower or "risk" in query_lower:
        return f"This complaint is classified as **{severity}** severity. Under standard GMP guidelines, a **{severity}** severity complaint requires: \n- Launching a formal deviation ticket inside the Quality Management System (QMS).\n- Concluding the investigation within 15 to 30 business days.\n" + (
            "- **Urgent Notification**: Since the severity is High/Critical, regulatory bodies (e.g., FDA/EMA) should be appraised if clinical adverse effects are validated." if severity in ["High", "Critical"] else ""
        )
        
    elif "fda" in query_lower or "regulatory" in query_lower or "report" in query_lower:
        return f"Under 21 CFR Part 211 (FDA) and EU Annex 11, we must maintain a complete investigation log for batch **{batch}**. If this issue correlates with any serious adverse event, we must submit a 15-day Alert Report to the FDA. All raw materials and manufacturing line reports must be preserved for inspector review."
        
    else:
        return f"I am reviewing the record for **{prod}** (Batch **{batch}**, Severity **{severity}**). Based on our QA guidelines, I recommend reviewing the active batch records and packaging checklists. Let me know if you would like me to draft a customer response email or recommend specific tests for the retention sample."
