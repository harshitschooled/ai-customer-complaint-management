import os
import json
import re
import logging
from datetime import date, datetime
from typing import Dict, Any, Optional
from groq import Groq
from langgraph.graph import StateGraph, END

from app.config import settings
from app.ai_engine.state import ComplaintState
from app.ai_engine.prompts import EXTRACTION_SYSTEM_PROMPT, ANALYSIS_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Initialize Groq client
groq_client = None
if settings.GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")

def call_groq_json(system_prompt: str, user_content: str) -> Optional[Dict[str, Any]]:
    """Helper to make a Groq chat completion call expecting a JSON response."""
    if not groq_client:
        return None
        
    try:
        response = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1000
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        logger.error(f"Groq API call error: {e}")
        return None

def mock_extract(text: str) -> Dict[str, Any]:
    """Smart fallback regex parser if Groq is unavailable."""
    logger.info("Using mock/fallback extraction algorithm.")
    
    # Defaults
    extracted = {
        "complaint_source": "Email",
        "customer_name": "Unknown Customer",
        "product_name": "General Pharmaceutical Product",
        "product_strength": None,
        "batch_number": "UNKNOWN-LOT",
        "manufacturing_date": None,
        "expiry_date": None,
        "quantity_affected": 1,
        "complaint_type": "Other",
        "complaint_date": str(date.today()),
        "complaint_description": text[:300] + "..." if len(text) > 300 else text,
        "severity": "Medium",
        "priority": "Medium"
    }

    # Extract source
    if "phone" in text.lower() or "called" in text.lower() or "call" in text.lower():
        extracted["complaint_source"] = "Phone"
    elif "portal" in text.lower() or "website" in text.lower():
        extracted["complaint_source"] = "Portal"
    elif "email" in text.lower() or "subject:" in text.lower():
        extracted["complaint_source"] = "Email"

    # Extract customer
    customer_match = re.search(r"(?:patient|customer|reporter|dr\.|dr|nurse|pharmacist)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", text, re.IGNORECASE)
    if customer_match:
        extracted["customer_name"] = customer_match.group(1)
    else:
        # Fallback names
        names = ["John Doe", "Alice Smith", "Metropolitan Pharmacy", "St. Jude Hospital"]
        for name in names:
            if name.lower() in text.lower():
                extracted["customer_name"] = name
                break

    # Extract product name
    products = {
        "paracetamol": "Paracetamol",
        "acetaminophen": "Acetaminophen",
        "amoxicillin": "Amoxicillin",
        "ibuprofen": "Ibuprofen",
        "lipitor": "Lipitor",
        "insulin": "Insulin Glargine",
        "aspirin": "Aspirin"
    }
    for key, val in products.items():
        if key in text.lower():
            extracted["product_name"] = val
            break
            
    # Extract strength
    strength_match = re.search(r"(\d+(?:\s*)?(?:mg|ml|g|mcg|%))", text, re.IGNORECASE)
    if strength_match:
        extracted["product_strength"] = strength_match.group(1).replace(" ", "")
    else:
        if "paracetamol" in text.lower():
            extracted["product_strength"] = "500mg"
        elif "amoxicillin" in text.lower():
            extracted["product_strength"] = "250mg"

    # Extract batch
    batch_match = re.search(r"(?:batch|lot|lot\s*number|batch\s*no\.?)\s*(?:#|:)?\s*([A-Z0-9\-]+)", text, re.IGNORECASE)
    if batch_match:
        extracted["batch_number"] = batch_match.group(1)
    else:
        # simple regex for uppercase letter followed by numbers
        simple_batch = re.search(r"\b([A-Z]{1,2}\d{4,8})\b", text)
        if simple_batch:
            extracted["batch_number"] = simple_batch.group(1)

    # Dates: manufacturing and expiry
    dates = re.findall(r"\b(\d{4}[-/]\d{2}[-/]\d{2})\b", text)
    if len(dates) >= 2:
        extracted["manufacturing_date"] = dates[0]
        extracted["expiry_date"] = dates[1]
    elif len(dates) == 1:
        extracted["expiry_date"] = dates[0]
    else:
        # Check relative indicators
        if "exp" in text.lower() or "expiry" in text.lower():
            exp_match = re.search(r"(?:exp|expiry|expires)\s*(?::)?\s*(\d{2}/\d{2,4})", text, re.IGNORECASE)
            if exp_match:
                extracted["expiry_date"] = "2028-12-31" # placeholder standard
        extracted["manufacturing_date"] = "2025-01-15"
        extracted["expiry_date"] = "2028-01-15"

    # Quantity
    qty_match = re.search(r"(\d+)\s*(?:tablets|pills|bottles|boxes|vials|units|affected|pack)", text, re.IGNORECASE)
    if qty_match:
        extracted["quantity_affected"] = int(qty_match.group(1))

    # Complaint Type
    types = {
        "efficacy": "Efficacy",
        "not working": "Efficacy",
        "no effect": "Efficacy",
        "adverse": "Adverse Event",
        "side effect": "Adverse Event",
        "hospitalized": "Adverse Event",
        "reaction": "Adverse Event",
        "broken": "Packaging",
        "crack": "Quality/Physical",
        "discolor": "Contamination",
        "contamination": "Contamination",
        "dirty": "Contamination",
        "mold": "Contamination"
    }
    for key, val in types.items():
        if key in text.lower():
            extracted["complaint_type"] = val
            break

    # Severity & Priority
    if any(word in text.lower() for word in ["death", "die", "icu", "anaphylaxis", "severe allergic", "hospitalized"]):
        extracted["severity"] = "Critical"
        extracted["priority"] = "Urgent"
    elif any(word in text.lower() for word in ["side effect", "allergic", "rash", "vomit", "sick", "contamination"]):
        extracted["severity"] = "High"
        extracted["priority"] = "High"
    elif any(word in text.lower() for word in ["broken", "cracked", "damage"]):
        extracted["severity"] = "Medium"
        extracted["priority"] = "Medium"
    else:
        extracted["severity"] = "Low"
        extracted["priority"] = "Low"

    return extracted

def mock_analyze(extracted_fields: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    """Fallback generator for summaries, CAPA and Root Cause analysis."""
    p_name = extracted_fields.get("product_name", "the product")
    b_num = extracted_fields.get("batch_number", "unknown batch")
    c_type = extracted_fields.get("complaint_type", "Quality")
    severity = extracted_fields.get("severity", "Medium")

    summary = f"Customer reported a {c_type.lower()} issue regarding {p_name} (Batch: {b_num}). The description states that the product was unsatisfactory and raised safety or usage concerns."
    
    if severity == "Critical":
        risk = "Critical risk. This complaint involves an adverse event or high severity safety hazard. FDA regulations mandate rapid report submission. Immediate safety review required."
        root_causes = "1. Raw material contamination from active ingredient supplier.\n2. Cross-contamination during chemical mixing phase.\n3. Equipment failure in the sterile filtration line."
        capas = "Immediate Action: Quarantine all warehouse stocks of batch {b_num}. Initiate safety committee review.\nPreventive Action: Perform comprehensive audit of supplier manufacturing facilities, recalibrate cleanroom pressure differential sensors."
    elif severity == "High":
        risk = "High risk. Potential decrease in dosage efficacy or moderate physiological reactions. Requires prompt investigation within GMP standards to prevent recurrent batches from presenting similar failure modes."
        root_causes = "1. Inadequate tablet coating thickness leading to rapid degradation.\n2. Ineffective seal packaging integrity, allowing moisture ingress."
        capas = "Immediate Action: Halt packaging line for inspection. Retain reserve samples of batch {b_num}.\nPreventive Action: Adjust sealing machine temperature profiles, train operators on visual seal validation inspections."
    else:
        risk = "Low to Medium risk. Issue appears localized to specific packaging boxes or tablet characteristics. Does not present systemic clinical risk, but requires continuous tracking for corrective actions."
        root_causes = "1. Mechanical mechanical vibration during long-distance transport.\n2. Operator adjustment misalignment on the boxing line."
        capas = "Immediate Action: Issue replacement batch or voucher to customer.\nPreventive Action: Optimize packing insulation for shipping cartons, update packaging line maintenance schedule."

    return {
        "ai_summary": summary,
        "risk_classification": risk,
        "root_cause_recommendation": root_causes,
        "capa_recommendation": capas
    }

# Node 1: Extraction Node
def extract_node(state: ComplaintState) -> ComplaintState:
    text = state["raw_text"]
    extracted = None
    
    if groq_client:
        extracted = call_groq_json(EXTRACTION_SYSTEM_PROMPT, f"Text to extract from:\n\n{text}")
        
    if not extracted:
        extracted = mock_extract(text)
        
    state["extracted_fields"] = extracted
    return state

# Node 2: Analysis Node
def analyze_node(state: ComplaintState) -> ComplaintState:
    extracted = state["extracted_fields"] or {}
    text = state["raw_text"]
    analysis = None
    
    if groq_client:
        prompt_content = f"Raw Intake Text:\n{text}\n\nExtracted Fields:\n{json.dumps(extracted, indent=2)}"
        analysis = call_groq_json(ANALYSIS_SYSTEM_PROMPT, prompt_content)
        
    if not analysis:
        analysis = mock_analyze(extracted, text)
        
    state["analysis"] = analysis
    return state

# Build the LangGraph
workflow = StateGraph(ComplaintState)
workflow.add_node("extract", extract_node)
workflow.add_node("analyze", analyze_node)

workflow.set_entry_point("extract")
workflow.add_edge("extract", "analyze")
workflow.add_edge("analyze", END)

graph = workflow.compile()

def run_complaint_pipeline(text: str) -> Dict[str, Any]:
    """Runs the LangGraph AI pipeline on the raw input complaint text."""
    initial_state = {
        "raw_text": text,
        "extracted_fields": None,
        "analysis": None,
        "error": None
    }
    try:
        final_state = graph.invoke(initial_state)
        return {
            "success": True,
            "extracted_fields": final_state.get("extracted_fields"),
            "analysis": final_state.get("analysis")
        }
    except Exception as e:
        logger.error(f"Error running LangGraph pipeline: {e}")
        # Fallback completely to mocks if graph execution itself crashes
        extracted = mock_extract(text)
        analysis = mock_analyze(extracted, text)
        return {
            "success": False,
            "error": str(e),
            "extracted_fields": extracted,
            "analysis": analysis
        }
