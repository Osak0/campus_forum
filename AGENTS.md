# Agentic Coding Guidelines for Campus Forum MVP

This repository contains a **FastAPI + SQLAlchemy + MySQL** backend and a **mobile-first HTML/JS/CSS** frontend. 
Follow these guidelines to ensure consistency and maintainability when working on this codebase.

## 1. Project Structure & Tech Stack

- **Backend** (`/backend`): 
  - Framework: FastAPI
  - ORM: SQLAlchemy (with Pydantic schemas)
  - Database: MySQL (production) / SQLite (dev)
  - Auth: JWT (OAuth2PasswordBearer)
- **Frontend** (`/frontend`):
  - Stack: Native HTML, CSS, JavaScript
  - Mobile: Capacitor (for Android packaging)
  - Build: Simple static file copying

## 2. Build, Run, and Test Commands

### Backend
- **Install Dependencies**:
  ```bash
  pip install -r backend/requirements.txt
  ```
- **Run Development Server**:
  ```bash
  # Must be run from the 'backend' directory
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```
- **Initialize Database**:
  ```bash
  cd backend && python init_db.py
  ```
- **Testing**:
  *Current Status*: Automated tests are not yet fully configured. Refer to `TESTING_SUMMARY.md` for manual verification steps.
  *Recommended Workflow*:
  1. Install test dependencies: `pip install pytest httpx`
  2. Create tests in a `tests/` directory within `backend/` or at root.
  3. Run tests (future): `pytest`
  4. Run single test: `pytest -k "test_function_name"`

### Frontend
- **Install Dependencies**:
  ```bash
  cd frontend && npm install
  ```
- **Build (Copy to `www/`)**:
  ```bash
  cd frontend && npm run build
  ```
- **Development**:
  Serve the `frontend/` (or `frontend/www`) directory using any static file server.
  Example: `python -m http.server 8080 --directory frontend`

## 3. Code Style & Conventions

### General
- **Indentation**: 4 spaces for Python, 2 or 4 spaces for JavaScript (consistency with file).
- **Naming**: 
  - Python: `snake_case` for variables/functions, `PascalCase` for Classes/Pydantic Models.
  - JavaScript: `camelCase` for variables/functions, `PascalCase` for classes.
- **Comments**: Explain *why*, not *what*. Use docstrings for complex functions.

### Backend (Python/FastAPI)
- **Imports**: Group imports: Standard lib -> Third-party -> Local application.
  ```python
  from datetime import datetime
  from fastapi import APIRouter, Depends
  from sqlalchemy.orm import Session
  import database
  from models import User
  ```
- **Type Hints**: Mandatory for function arguments. Recommended for return values.
  ```python
  def get_user(db: Session, user_id: int) -> User | None:
  ```
- **Routers**: Use `APIRouter` to modularize endpoints in `backend/routers/`.
- **Database Sessions**: Always inject `db: Session = Depends(database.get_db)`.
- **Error Handling**: Use `fastapi.HTTPException` with appropriate status codes (400, 401, 403, 404).
- **Security**: 
  - Never commit secrets (API keys, passwords). Use `.env` file (see `.env.example`).
  - Validate inputs using Pydantic schemas.

### Frontend (JavaScript)
- **Structure**: Separate logic into `.js` files; avoid inline scripts where possible.
- **Mobile-First**: Ensure UI is responsive and touch-friendly.
- **API Calls**: Use `fetch` API. Handle errors gracefully and provide user feedback (e.g., alerts or toast messages).

## 4. Copilot & Project Rules (from .github/copilot-instructions.md)

### Project Baseline
- **Stack**: Backend is **FastAPI + SQLAlchemy + MySQL**. Keep this baseline unless there is a clear need.
- **Frontend**: Must stay **mobile-friendly** (responsive layout first, then desktop enhancement).
- **Technologies**: Prefer **mainstream, well-maintained technologies**; avoid niche or low-adoption libraries.

### Technical Recommendations
#### Backend (Performance + Security)
- Use FastAPI async endpoints where appropriate.
- Keep DB access efficient (indexes, pagination, selective fields).
- Run with production ASGI stack (Gunicorn + Uvicorn) behind Nginx in production.
- **Auth**: Keep authentication as JWT; enforce least-privilege checks.
- **Validation**: Always validate and sanitize input with Pydantic/FastAPI validation.
- **Security**: Add rate limiting, strict CORS, upload type/size limits.

#### Frontend (Mobile Adaptation)
- **Responsive**: Keep responsive design with mobile-first CSS breakpoints.
- **Performance**: Prioritize fast interaction (small bundles, lazy loading, compressed images).
- **UX**: Ensure touch-friendly UI (tap target size, typography).

#### Data Model
- Core entities: **users**, **posts**, **comments**.
- Use explicit foreign keys and indexes.
- Keep extensibility in mind (moderation status, soft-delete, audit timestamps).

### Business Requirements
- **Moderation**: Layered strategy:
  1. Keyword filtering.
  2. Risk scoring/rules.
  3. Optional CAPTCHA.
  4. Manual review channel.
- Follow industry best practices for abuse prevention.

### Cost-Control (Student Team)
- Prefer mature open-source components.
- Choose low-maintenance architecture.
- Add observability basics (logs, error tracking) to reduce troubleshooting time.

---
*Note: This file is auto-generated to guide AI agents. Please update it if project conventions change.*
