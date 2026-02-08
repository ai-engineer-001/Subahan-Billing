# Subahan Billing Platform

Monorepo with:
- `frontend/` Next.js UI (Vercel hosting)
- `backend/` Go API (Render hosting)

## Neon
- Apply the SQL in `backend/migrations/001_init.sql` to your Neon database.
- Set `DATABASE_URL` in the backend `.env`.

## Run locally
```bash
# backend
cd backend
go run ./cmd/server

# frontend
cd frontend
npm install
npm run dev
```

## Hosting notes
- Vercel: set `NEXT_PUBLIC_API_BASE_URL` to your Render API URL + `/api`.
- Render: set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `CORS_ORIGIN` to the Vercel URL.
