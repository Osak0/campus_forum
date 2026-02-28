# Copilot Instructions for campus_forum

## Project baseline
- Backend stack is **FastAPI + SQLAlchemy + MySQL**. Keep this baseline unless there is a clear need.
- Frontend must stay **mobile-friendly** (responsive layout first, then desktop enhancement).
- Prefer **mainstream, well-maintained technologies**; avoid niche or low-adoption libraries.

## Technical recommendations

### Backend (performance + security under high concurrency)
- Use FastAPI async endpoints where appropriate and keep DB access efficient (indexes, pagination, selective fields).
- Run with a production ASGI stack (e.g., **Gunicorn + Uvicorn workers**) behind **Nginx**.
- Use Redis for common high-concurrency needs (rate limiting, cache, short-lived anti-abuse state) when needed.
- Keep authentication as JWT; enforce least-privilege checks in each protected endpoint.
- Always validate and sanitize input with Pydantic/FastAPI validation.
- Add practical protections: request rate limiting, strict CORS, upload type/size limits, and security headers.

### Frontend (mobile adaptation)
- Keep responsive design with mobile-first CSS breakpoints.
- Prioritize fast interaction on low-end phones (small bundles, lazy loading where possible, compressed images).
- Ensure touch-friendly UI: adequate tap target size, readable typography, and simple navigation.
- Preserve progressive web app support if already present.

### Data model (future expansion)
- Keep clear core entities: **users**, **posts**, **comments**.
- Use explicit foreign keys and indexes (e.g., post_id, user_id/email, created_at).
- Keep extensibility in mind: moderation status, soft-delete fields, and audit timestamps are preferred over hard-coupled logic.

## Business requirements and moderation
- The forum must provide a stable, fast, and reliable user experience.
- For prohibited content (pornography, political/extremist, illegal topics), use a layered moderation strategy:
  1. keyword/sensitive-word filtering,
  2. risk scoring + rule-based interception,
  3. optional CAPTCHA/rate-limiting for suspicious traffic,
  4. **manual review channel** for user appeals/feedback.
- Follow industry best practices for abuse prevention; do not rely on obscure security libraries.

## Cost-control principles (student team)
- Prefer mature open-source components with active communities and clear docs.
- Choose low-maintenance architecture over premature complexity.
- Add observability basics (structured logs, error tracking, slow-query monitoring) to reduce troubleshooting time.
- Implement features incrementally and prioritize high-impact, low-maintenance solutions.
