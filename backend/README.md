# Subahan Billing Backend

## Setup
- Copy `.env.example` to `.env` and fill values.
- Apply SQL in `migrations/001_init.sql` to Neon.

## Run
```bash
cd backend
go run ./cmd/server
```

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
