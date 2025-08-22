# App1 - Next.js Frontend

A minimal Next.js app that uses a central FastAPI auth service for login/logout and protecting routes via HttpOnly cookies.

## Prerequisites
- FastAPI backend running at `http://127.0.0.1:8000` (see `backend/app.py`).
- Node.js 18+

## Setup
1. Copy env and adjust as needed:
   ```bash
   cp .env.local.example .env.local
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

Open http://localhost:3000

## Notes
- Cookies are set as HttpOnly and read by API routes/middleware on the server.
- For cross-subdomain deployment, set `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, and `COOKIE_DOMAIN=.your-domain.com`.
- Protected page: `/dashboard`.
- Auth endpoints proxied via:
  - `POST /api/auth/login` (sets cookie)
  - `POST /api/auth/logout` (clears cookie)
  - `GET /api/me` (returns current user using the cookie token)
