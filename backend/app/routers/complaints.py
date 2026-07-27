from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Complaint as DBComplaint
from app.schemas import ComplaintCreate, ComplaintResponse

router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"]
)

@router.post("/check-duplicate")
def check_duplicate(payload: dict, db: Session = Depends(get_db)):
    product_name = payload.get("product_name")
    batch_number = payload.get("batch_number")
    
    if not product_name or not batch_number:
        return {"duplicate": False}
        
    # Search for an existing complaint with same product and batch number (case-insensitive)
    existing = db.query(DBComplaint).filter(
        DBComplaint.product_name.ilike(product_name.strip()),
        DBComplaint.batch_number.ilike(batch_number.strip())
    ).first()
    
    if existing:
        return {
            "duplicate": True,
            "id": existing.id,
            "customer_name": existing.customer_name,
            "complaint_date": str(existing.complaint_date) if existing.complaint_date else None,
            "severity": existing.severity
        }
        
    return {"duplicate": False}


@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(complaint_in: ComplaintCreate, db: Session = Depends(get_db)):
    db_complaint = DBComplaint(
        complaint_source=complaint_in.complaint_source,
        customer_name=complaint_in.customer_name,
        product_name=complaint_in.product_name,
        product_strength=complaint_in.product_strength,
        batch_number=complaint_in.batch_number,
        manufacturing_date=complaint_in.manufacturing_date,
        expiry_date=complaint_in.expiry_date,
        quantity_affected=complaint_in.quantity_affected,
        complaint_type=complaint_in.complaint_type,
        complaint_date=complaint_in.complaint_date,
        complaint_description=complaint_in.complaint_description,
        severity=complaint_in.severity,
        priority=complaint_in.priority,
        ai_summary=complaint_in.ai_summary,
        risk_classification=complaint_in.risk_classification,
        root_cause_recommendation=complaint_in.root_cause_recommendation,
        capa_recommendation=complaint_in.capa_recommendation
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint

@router.get("/", response_model=List[ComplaintResponse])
def read_complaints(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by customer name, product, or description"),
    severity: Optional[str] = Query(None, description="Filter by severity (Low, Medium, High, Critical)"),
    complaint_type: Optional[str] = Query(None, description="Filter by type (Efficacy, Adverse Event, etc.)"),
    db: Session = Depends(get_db)
):
    query = db.query(DBComplaint)
    
    if severity:
        query = query.filter(DBComplaint.severity.ilike(severity))
        
    if complaint_type:
        query = query.filter(DBComplaint.complaint_type.ilike(complaint_type))
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            DBComplaint.customer_name.ilike(search_filter) |
            DBComplaint.product_name.ilike(search_filter) |
            DBComplaint.complaint_description.ilike(search_filter) |
            DBComplaint.batch_number.ilike(search_filter)
        )
        
    # Order by newest first
    query = query.order_by(DBComplaint.created_at.desc())
    
    complaints = query.offset(skip).limit(limit).all()
    return complaints

@router.get("/{complaint_id}", response_model=ComplaintResponse)
def read_complaint(complaint_id: str, db: Session = Depends(get_db)):
    db_complaint = db.query(DBComplaint).filter(DBComplaint.id == complaint_id).first()
    if not db_complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {complaint_id} not found"
        )
    return db_complaint

@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(complaint_id: str, db: Session = Depends(get_db)):
    db_complaint = db.query(DBComplaint).filter(DBComplaint.id == complaint_id).first()
    if not db_complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {complaint_id} not found"
        )
    db.delete(db_complaint)
    db.commit()
    return None
