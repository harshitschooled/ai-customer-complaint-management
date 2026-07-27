from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_get_complaints_empty():
    response = client.get("/api/complaints/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_ai_extract_empty_text():
    response = client.post("/api/ai/extract", json={"text": ""})
    assert response.status_code == 400

def test_ai_extract_paracetamol_email():
    email_text = "Subject: Issue with Paracetamol 500mg. Batch A1234 has cracked tablets. Total 10 packages affected."
    response = client.post("/api/ai/extract", json={"text": email_text})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    fields = data["extracted_fields"]
    assert fields["product_name"] == "Paracetamol"
    assert fields["product_strength"] == "500mg"
    assert fields["batch_number"] == "A1234"
    assert fields["quantity_affected"] == 10
    
    analysis = data["analysis"]
    assert "ai_summary" in analysis
    assert "risk_classification" in analysis
    assert "root_cause_recommendation" in analysis
    assert "capa_recommendation" in analysis

def test_ai_chat_mock():
    chat_payload = {
        "message": "What is the recommended CAPA for this product?",
        "history": [],
        "context": "Product: Paracetamol\nBatch Number: B123\nSeverity: Medium"
    }
    response = client.post("/api/ai/chat", json=chat_payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "history" in data
    assert len(data["history"]) == 2
    assert "capa" in data["response"].lower() or "corrective" in data["response"].lower()


