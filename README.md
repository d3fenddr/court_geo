### Backend – run API

```bash
cd backend
npm install        # first time only
copy .env.example .env  # if you want to tweak config
npm run dev        # or: npm start
```

Key env vars (`backend/.env`):

- `PORT` – default `4000`
- `DEV_MODE` – `1` to disable distance check for check‑in (useful for local testing)
- `CHECKIN_RADIUS_METERS` – radius in meters when `DEV_MODE` is off

API base: `http://localhost:4000`

JSON data lives in `backend/src/data/*.json` (courts, users, meetings).

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