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
- Connect your GitHub repo and select the `frontend` directory as the root.
- Set `NEXT_PUBLIC_API_BASE_URL` to your Render API URL + `/api`.

### Render (backend)
- Use the `render.yaml` file at the repository root (auto-detected) OR configure manually.
- Set these environment variables:
  - `DATABASE_URL` = your Neon connection string
  - `JWT_SECRET` = strong random value
  - `ADMIN_USERNAME` = admin username
  - `ADMIN_PASSWORD` = admin password
  - `CORS_ORIGIN` = your Vercel frontend URL
- `PORT` is set to 8080 by default.
