from typing import TypedDict, Optional, Dict, Any

class ComplaintState(TypedDict):
    raw_text: str
    extracted_fields: Optional[Dict[str, Any]]
    analysis: Optional[Dict[str, Any]]
    error: Optional[str]
