# KhataBox — Run Locally (Full Steps)

This project has **two parts**:
- **Frontend**: Next.js (runs on **http://localhost:3000**)
- **Backend API**: FastAPI + Uvicorn (runs on **http://localhost:8002**)
- **Dependencies**: PostgreSQL + Redis via `docker-compose`
- **Demo data**: created using Alembic migrations + `seed_india.py`

The repo includes a Windows launcher script: `scripts\start-khatabox.bat`. The steps below match what that script does.

---

## 0) Prerequisites

1. **Install Docker Desktop** and ensure it is running.
2. **Install Node.js + npm** (for the Next.js frontend).
3. **Install Python 3.10+**.
   - The backend launcher script uses a project-local venv it creates under `backend/venv/`.
4. Ensure ports are free:
   - Frontend: **3000**
   - Backend: **8002**
   - Postgres: **5432**
   - Redis: **6379**

---

## 1) Start everything using the provided launcher (recommended)

From the repo root:

```bat
cd "D:\1. PLACEMENT\1A. PROJECTS\KhataBox"
scripts\start-khatabox.bat
```

This script performs:
1. `docker compose up -d` (starts **Postgres** + **Redis**)
2. Waits for Postgres health
3. Runs DB migrations:
   - `alembic upgrade head`
4. Seeds demo data:
   - `python seed_india.py`
5. Starts backend:
   - `uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload`
6. Starts frontend:
   - `cd frontend && npm run dev` (Next.js on port **3000**)

After it finishes, you should see URLs like:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8002/docs
- Backend health: http://localhost:8002/health

---

## 2) Manual steps (equivalent to the launcher)

### 2.1 Start PostgreSQL + Redis

```bat
cd "D:\1. PLACEMENT\1A. PROJECTS\KhataBox"
docker compose -f docker-compose.yml up -d
```

### 2.2 Backend setup (Python)

1. Create/activate backend environment:

```bat
cd "D:\1. PLACEMENT\1A. PROJECTS\KhataBox\backend"
python -m venv venv
venv\Scripts\python.exe -m pip install --upgrade pip
venv\Scripts\python.exe -m pip install -r requirements.txt
```

2. Run migrations:

```bat
venv\Scripts\python.exe -m alembic upgrade head
```

3. Seed demo data:

```bat
venv\Scripts\python.exe seed_india.py
```

4. Start backend server:

```bat
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload --log-level info
```

Backend will be available at:
- http://localhost:8002/health
- http://localhost:8002/docs

### 2.3 Frontend setup (Node)

1. Install dependencies (from repo root):

```bat
cd "D:\1. PLACEMENT\1A. PROJECTS\KhataBox\frontend"
npm install
```

2. Start Next.js dev server:

```bat
npm run dev
```

Frontend will be available at:
- http://localhost:3000

---

## 3) Use the seeded accounts (demo)

The seeder prints credentials; commonly expected demo credentials are:
- **Admin**: `admin@khatabox.com` / `Admin@123`
- **Shopkeepers**: `<shop_name>@khatabox.com` / `Shop@123`
- **Customers**: `<customer_email>` / `customer123`

(Exact shopkeeper/customer emails are shown during `seed_india.py` run.)

---

## 4) Stopping the project

1. Stop backend + frontend dev servers (close terminal windows / stop `npm run dev` in `frontend/` and Uvicorn).
2. Stop containers:

```bat
docker compose -f docker-compose.yml down
```

---

## 5) Troubleshooting

### Port already in use
- Check and free: `3000`, `8002`, `5432`, `6379`.

### Docker not running
- `scripts\start-khatabox.bat` will fail early with a Docker Compose error.

### Migrations/seeding fail
- Re-run migrations:
  - `python -m alembic upgrade head`
- Then re-run seeding:
  - `python seed_india.py`

### Frontend can’t reach API
- Confirm backend is running at **http://localhost:8002**.
- Verify environment variable `NEXT_PUBLIC_API_URL` (if set); otherwise frontend defaults to `http://localhost:8000` in `src/lib/api.ts`. (If you need it, set it to `http://localhost:8002`.)

