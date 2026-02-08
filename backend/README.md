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
### Option 1: Use render.yaml (recommended)
- The root `render.yaml` file configures the build automatically.
- Set the required environment variables in the Render dashboard.

### Option 2: Manual configuration
If configuring manually in Render:
- **Build Command**: `cd backend && go build -tags netgo -ldflags '-s -w' -o bin/server ./cmd/server`
- **Start Command**: `cd backend && ./bin/server`
- **Root Directory**: Leave at repository root (Render will cd into backend)

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
