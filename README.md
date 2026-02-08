# Subahan Billing Platform

Monorepo with:
- `frontend/` Next.js UI (Vercel hosting)
- `backend/` Go API (Render hosting)

## Neon
- Apply the SQL in `backend/migrations/001_init.sql` to your Neon database.
- Set `DATABASE_URL` in the backend `.env` (local) or Render environment variables (hosted).

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
### Vercel (frontend)
- Set `NEXT_PUBLIC_API_BASE_URL` to your Render API URL + `/api`.

### Render (backend)
- Set `DATABASE_URL` to your Neon connection string.
- Set `JWT_SECRET` to a strong random value.
- Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` for the admin login.
- Set `CORS_ORIGIN` to your Vercel frontend URL.
- Set `PORT` if Render does not provide it automatically.
