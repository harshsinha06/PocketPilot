# PocketPilot

A monthly budget tracker for college students. You record income and expenses, set a spending budget, and see what is left before the month ends.

## Setup

1. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Create the env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

3. In `backend/.env`:

- `MONGODB_URI` — a MongoDB connection string. Local MongoDB can use `mongodb://127.0.0.1:27017/pocketpilot`. Atlas looks like `mongodb+srv://USER:PASSWORD@cluster.example.net/pocketpilot`.
- `JWT_SECRET` — a long random string used to sign login tokens.
- `CLIENT_URL` — the exact frontend origin, such as `http://localhost:3000`.
- `PORT` — the API port. `5001` avoids a clash with AirPlay on macOS, which often holds port 5000.

4. In `frontend/.env.local`:

- `NEXT_PUBLIC_API_URL` — the API origin, such as `http://localhost:5001`.

There is no AI provider in this build, so no AI key is required.

5. Start MongoDB, then the API, then the site:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

Open the URL Next.js prints. If that is not port 3000, set `CLIENT_URL` in `backend/.env` to that origin and restart the API.
