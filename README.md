# AI-Powered Customer Complaint Management System (Pharma QMS)

A production-quality Customer Complaint Management System designed for a pharmaceutical manufacturing environment. It leverages an AI pipeline (LangGraph + Groq) to parse and extract key complaint details from documents (PDF, DOCX) or pasted text, autofill GMP compliance log forms, and provides an interactive AI QA Copilot to analyze severity, recommend root causes, recommend Corrective and Preventive Actions (CAPA), and chat context-aware about specific complaints.

This project was built to high engineering standards for an internship assessment, featuring a clean architecture, robust error-handling, loading states, and database fallback.

---

## 🛠️ Tech Stack

### Frontend
- **React (Vite)**: Fast, modern SPA builder.
- **Redux Toolkit**: Centralized state management for complaints, uploads, and chat history.
- **React Router v6**: Client-side routing for seamless views.
- **Axios**: Promised-based client for REST API communication.
- **Tailwind CSS v4**: Utility-first styling with modern glassmorphism UI.
- **Lucide Icons**: Clean, professional iconography.

### Backend
- **Python 3.14+**
- **FastAPI**: Asynchronous, high-performance web framework.
- **SQLAlchemy**: ORM for database mapping.
- **PostgreSQL**: Production-grade persistent database.
- **SQLite Fallback**: Automatically fallbacks to local SQLite (`complaints.db`) if PostgreSQL is not active, making checking/testing immediate and seamless.

### AI Engine
- **LangGraph**: Orchestrates the intake workflow (Extraction Node -> Analysis Node).
- **Groq API**: Connected to the fast `gemma2-9b-it` model.
- **Regex & Mock Fallback**: If no Groq API Key is supplied or calls fail, a rule-based AI parser processes inputs, extracts products (e.g. Paracetamol, Amoxicillin), strengths, batch numbers, dates, and suggests CAPA plans, keeping the system fully operational.

---

## 📂 Project Structure

```
customer-complaint-system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI entrypoint, registers routers, initializes DB
│   │   ├── config.py           # Configuration loader (.env, database details)
│   │   ├── database.py         # SQLAlchemy engine setup (PostgreSQL with SQLite fallback)
│   │   ├── models.py           # SQLAlchemy DB models (Complaints table)
│   │   ├── schemas.py          # Pydantic data schemas (requests & responses validation)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── complaints.py   # CRUD database REST routes
│   │   │   └── ai.py           # File upload, LangGraph extract, Copilot chat routes
│   │   └── ai_engine/
│   │       ├── __init__.py
│   │       ├── graph.py        # LangGraph state machine, nodes, and mock extractors
│   │       ├── state.py        # LangGraph State TypedDict
│   │       └── prompts.py      # System and user prompt templates
│   ├── requirements.txt        # Backend dependencies
│   └── .env                    # Environment variables (DB URL, Groq API Key)
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Common/
│   │   │   │   └── Layout.jsx  # Shared premium navigation layout
│   │   │   ├── Dashboard/
│   │   │   │   └── Dashboard.jsx # Stat metrics cards & complaints table log
│   │   │   ├── Intake/
│   │   │   │   └── Intake.jsx  # Doc upload, text paste, AI extract & Form fields
│   │   │   └── Copilot/
│   │   │       └── Copilot.jsx # Split view detail & AI Copilot Workspace
│   │   ├── store/
│   │   │   ├── index.js        # Redux store config
│   │   │   └── slices/
│   │   │       └── complaintsSlice.js # Slice for complaints state & async thunks
│   │   ├── services/
│   │   │   └── api.js          # Axios API base configuration
│   │   ├── App.jsx             # React router path setup
│   │   ├── main.jsx            # React bootstrap with Redux Provider
│   │   └── index.css           # Tailwind base styles and theme overrides
│   ├── tailwind.config.js      # Tailwind configurations
│   ├── postcss.config.js       # PostCSS configurations
│   ├── vite.config.js          # Vite configurations
│   └── package.json            # Frontend node packages
└── README.md
```

---

## 🚀 How to Run the Project

### 1. Prerequisites
- **Python**: Version 3.12+ (Tested on Python 3.14.3)
- **Node.js & npm**: Node 18+ (Tested on npm 11+)
- **PostgreSQL** (Optional, falls back to SQLite)

---

### 2. Run the Backend Service

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up Environment Variables:
   - Edit the `.env` file inside the `backend` folder.
   - If using **Groq**, add your `GROQ_API_KEY`:
     ```env
     GROQ_API_KEY=gsk_your_key_here
     ```
   - If using a custom **PostgreSQL** server:
     ```env
     DATABASE_URL=postgresql://user:password@localhost:5432/your_database
     ```
   - *Note: If PostgreSQL is not running, the application automatically builds a local `complaints.db` SQLite database.*
5. Run the dev server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The Swagger interactive API documentation will be available at `http://localhost:8000/docs`.*

---

### 3. Run the Frontend Service

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The app will start and be available at `http://localhost:5173`.*

---

## 🧪 Running Tests
To execute backend tests and verify database connectivity, routing, and mock AI pipeline behavior:
```bash
cd backend
.\venv\Scripts\activate
python -m pytest
```
All tests should pass successfully.
