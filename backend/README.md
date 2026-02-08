# Subahan Billing Backend

## Setup
- Create `.env` and fill values for local development.
- Apply SQL in `migrations/001_init.sql` to Neon.

## Run
```bash
cd backend
go run ./cmd/server
```

## Hosting (Render)
Set these environment variables in Render:
- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `CORS_ORIGIN`

## API
- `POST /api/auth/login`
- `GET /api/items?includeDeleted=true`
- `POST /api/items`
- `PUT /api/items/{itemId}`
- `DELETE /api/items/{itemId}`
- `POST /api/items/{itemId}/restore`
- `GET /api/bills`
- `POST /api/bills`
- `GET /api/bills/{billId}`
