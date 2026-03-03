### Vercel Deployment

**Frontend:** https://court-geo.vercel.app/  
**Backend API:** https://court-geo-backend.vercel.app/api/

## Project Structure

```
court_geo/
├── backend/                # Backend API (Vercel serverless)
│   ├── api/               # Vercel entry point
│   │   ├── index.js      # Handler function
│   │   ├── src/          # Server code
│   │   └── package.json
│   ├── src/              # (deprecated - use api/src instead)
│   ├── vercel.json       # Vercel config for backend
│   └── package.json
│
├── frontend/             # Frontend SPA
│   ├── index.html
│   ├── styles.css
│   ├── src/
│   └── (deploy to Vercel separately)
│
└── README.md
```

## Local Development

### Setup

```bash
# Backend only
cd backend
npm install

# Frontend only
cd frontend
npm install
```

### Run Backend API

```bash
cd backend
npm run dev    # Watch mode
# or
npm start      # Single run
```

API base: `http://localhost:4000`

### Run Frontend (SPA)

```bash
cd frontend
npx serve . -l 5173
```

Frontend: `http://localhost:5173`

## Vercel Deployment

### Backend Deployment

The backend is deployed as Vercel Serverless Functions:
1. Push to repo
2. Create Vercel project from `backend/` folder
3. Add **Upstash Redis** integration (Project Settings → Storage)
4. Redeploy

The `backend/api/index.js` is the entry point for Vercel.

### Frontend Deployment

The frontend is a static SPA:
1. Push to repo
2. Create Vercel project from `frontend/` folder
3. No special config needed

The `frontend/src/config.js` defines API base URL (backend Vercel URL).

## Vercel Backend Configuration (Redis)

After adding Upstash Redis to your Vercel backend project:

1. ✅ Vercel automatically adds these env vars:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

2. **No additional setup needed** — the backend code automatically:
   - Uses Redis on production (Vercel)
   - Uses file system locally (for development)

3. After adding Redis in Vercel:
   - Redeploy the backend project
   - All `DELETE`, `PUT`, `POST` operations now work on production

✨ The database code (`backend/api/src/db/jsonStore.js`) handles both seamlessly!

### Hobby Plan Limitation

⚠️ **Vercel Hobby Plan**: Max 12 Serverless Functions per deployment
- Backend is configured with only **1 function** (`api/index.js`)
- All routes are handled by Express through this single function
- If you hit the limit, upgrade to Pro plan in Vercel

### Frontend – run SPA

Any static server is fine; example with `serve`:

```bash
cd frontend
npx serve . -l 5173
```

Then open:

- `http://localhost:5173`

### Auth & roles

- Demo users are defined in `backend/src/data/users.json`