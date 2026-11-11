# AI Intelligence Universe

An immersive 3D developer portfolio for an **AI Developer · AI Automation Engineer · Full-Stack Developer**. Visitors fly through a holographic universe built with real WebGL geometry: each project is a 3D exhibition connected to a working backend demo.

- **Frontend:** React 19, Vite, Three.js, React Three Fiber, Drei, GSAP (ScrollTrigger), Framer Motion, Tailwind CSS v4
- **Backend:** Python 3.12, FastAPI, Pydantic, SQLAlchemy (SQLite locally, PostgreSQL in production)

## What's inside

| Area                            | 3D environment                                                            | Live functionality                                                     |
| ------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Opening                         | Cinematic intro: starfield, holographic globe materialising, camera sweep | Skippable (button / Esc), plays once per session                       |
| Avalanche Intelligence Platform | Holographic mountain built from a DEM grid, scan beam, survey rings       | Slope analysis (Horn's method) and rule-based terrain assessment       |
| AI Business Automation Agent    | Point-cloud neural core with 4 workflow stages                            | Runs real triage / sales-summary workflows; 3D replays the step log    |
| AI-Enabled Car Sales Platform   | Wireframe car showroom, six body types, inventory miniatures              | Lead capture, scoring, simulated follow-ups, live pipeline             |
| AI Workflow Lab                 | Five-stage pipeline: collect → process → analyse → decide → output        | Inspect each stage, run a packet through the pipeline                  |
| Skills                          | Constellation of 8 skill areas linked by shared skills                    | Skills mapped to the projects that use them                            |
| About                           | Identity core, `identity.json` editor panel                               | Profile from `profile.js`                                              |
| Contact                         | Transmission beacon                                                       | Validated, spam-protected form stored in the database (optional email) |

Also: focus mode (click an exhibit → camera close-up, drag to rotate, wheel to zoom, Esc to exit), full case-study pages at `/projects/<slug>`, a 2D fallback (no WebGL / "3D Off"), adaptive quality for low-power devices, and reduced-motion support.

> **Honesty by design:** project statuses are configurable labels (`Prototype`, `In Development`, `Live`). The demos clearly state when data is synthetic or sample data, the agent reports that it is rule-based (no LLM yet), and no metrics or accuracy figures are invented.

## Project structure

```
AI-Developer-Portfolio/
├── frontend/                 React + Vite app (deploys to Vercel)
│   ├── src/
│   │   ├── data/             ← your content: profile.js, projects.json, skills.js, workflowLab.js
│   │   ├── three/            3D scene: globe, exhibits/, environments/, camera rig, shaders/
│   │   ├── components/       HTML layer: sections, demos, HUD, intro, focus overlay
│   │   ├── pages/            Universe page, case-study page, 404
│   │   ├── store/ hooks/ lib/
│   └── vercel.json
├── backend/                  FastAPI app (deploys to Render or Railway)
│   ├── app/
│   │   ├── routes/           health, contact, projects
│   │   ├── demos/            one self-contained backend per project (avalanche, automation_agent, car_sales)
│   │   ├── models/ schemas/ services/ data/
│   ├── tests/                pytest suite
│   └── requirements.txt
├── scripts/                  cross-platform setup / dev / check scripts (npm run setup | dev | check)
├── package.json              root scripts only (no dependencies)
└── render.yaml               Render blueprint (API + PostgreSQL)
```

## 1. Run it on any computer

### What to install first (one time)

| Software    | Version            | Download                                                                      |
| ----------- | ------------------ | ----------------------------------------------------------------------------- |
| **Git**     | any recent         | https://git-scm.com/downloads                                                 |
| **Node.js** | 22 LTS (or 20.19+) | https://nodejs.org                                                            |
| **Python**  | 3.12 (3.11+ works) | https://www.python.org/downloads (Windows: tick **"Add python.exe to PATH"**) |

### Quick start (Windows, macOS and Linux)

```bash
git clone https://github.com/mtaha2588/Taha-Portfolio.git
cd Taha-Portfolio
npm run setup     # one time: Python environment + packages, backend/.env, frontend packages
npm run dev       # starts the backend and the website together (Ctrl+C stops both)
```

Then open **http://localhost:5173**. The API runs at http://localhost:8000 (docs at http://localhost:8000/docs).

- `npm run setup` creates `backend/.venv`, installs the exact Python package versions from `backend/requirements.txt`, copies `backend/.env.example` to `backend/.env`, and installs the frontend packages exactly as locked in `frontend/package-lock.json`.
- `npm run check` runs all quality checks: backend tests, lint, formatting and a production build.
- No database setup is needed locally: a SQLite file (`backend/portfolio.db`) is created automatically.

### Manual alternative (two terminals)

**Backend** (terminal 1):

```powershell
# Windows (PowerShell)
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

```bash
# macOS / Linux
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (terminal 2, any OS):

```bash
cd frontend
npm ci
npm run dev
```

In development the frontend talks to `http://localhost:8000` automatically.

## 2. Make it yours

1. **`frontend/src/data/profile.js`**: your name, initials, email, LinkedIn, GitHub, availability, about text. Empty fields are hidden rather than shown as broken links; `npm run dev` prints a reminder of missing fields in the browser console.
2. **Résumé:** put `resume.pdf` in `frontend/public/` and set `resumeUrl: "/resume.pdf"`.
3. **`frontend/src/data/projects.json`**: project text, `status`, `links.demo`, `links.github` and `screenshots` (`[{ "src": "/projects/avalanche-1.png", "caption": "…" }]`, images in `frontend/public/projects/`). Then copy it to the backend:
   ```powershell
   cd frontend; npm run sync:projects
   ```
4. **Skills:** `frontend/src/data/skills.js`. Levels are intentionally not shown; "used in" links come from each project's `technologies`.

### Connecting your real projects later

Each project demo lives in `backend/app/demos/<project>/` (`router.py`, `schemas.py`, `service.py`). When a real project is deployed, set its URL in the backend environment and the portfolio forwards requests to it instead of the built-in demo:

```
AVALANCHE_SERVICE_URL=https://your-avalanche-api.example.com
AUTOMATION_AGENT_SERVICE_URL=
CAR_SALES_SERVICE_URL=
```

Your service must accept and return the shapes defined in that project's `schemas.py`. `/api/health` shows each demo as `built-in` or `remote`.

## 3. Quality checks

From the project root: `npm run check` (runs everything below). Or individually:

```powershell
cd frontend
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build         # production build

cd ..\backend
.venv\Scripts\python -m pytest -q
```

## 4. Deploy

The frontend and backend are deployed separately, on different URLs.

### a) GitHub

The code lives at **https://github.com/mtaha2588/Taha-Portfolio**. After changing anything:

```bash
git add -A
git commit -m "Describe your change"
git push
```

Render and Vercel redeploy automatically on every push to `main` once they're connected.

### b) Backend on Render (recommended)

1. Render dashboard → **New → Blueprint** → connect your GitHub repo. Render reads `render.yaml` and creates the **API** and a **PostgreSQL** database.
2. When prompted, set `CORS_ORIGINS` to your Vercel URL (you can come back after step c), e.g. `https://your-portfolio.vercel.app`. Optional: `CORS_ORIGIN_REGEX` for Vercel previews and the `SMTP_*` values for email notifications.
3. After deploy, check `https://<your-api>.onrender.com/api/health` returns `"status": "ok"`.

Notes:

- Use PostgreSQL in production: Render's free web services have an ephemeral disk, so a SQLite file would be wiped on every deploy or restart. The app switches databases purely via `DATABASE_URL`.
- Free Render services sleep when idle and take ~30–60 s to wake. The site handles this: 3D exhibits render from local data and the demo panels show "API offline · Retry" until the API answers.
- Render's free PostgreSQL databases expire after a limited period; upgrade the plan or move to another Postgres provider (e.g. Neon, Supabase) by changing `DATABASE_URL`.
- `ADMIN_API_KEY` is generated for you. Read contact messages with:
  ```powershell
  curl.exe -H "X-Admin-Key: <key>" https://<your-api>.onrender.com/api/contact/messages
  ```

**Alternative: Railway.** New project → Deploy from GitHub repo → set the service **Root Directory** to `backend`. The `Procfile` provides the start command. Add a PostgreSQL plugin and set the same environment variables as in `render.yaml` (`DATABASE_URL` from the plugin, `APP_ENV=production`, `TRUST_PROXY=true`, `CORS_ORIGINS`, `ADMIN_API_KEY`).

### c) Frontend on Vercel

1. Vercel → **Add New → Project** → import the GitHub repo.
2. **Root Directory:** `frontend` (framework preset: Vite; `vercel.json` sets the rest).
3. **Environment variable:** `VITE_API_URL` = your backend URL, e.g. `https://ai-universe-api.onrender.com` (no trailing slash).
4. Deploy. Then make sure the backend's `CORS_ORIGINS` contains the exact Vercel URL and redeploy the backend if you changed it.

`VITE_*` variables are public (bundled into the JavaScript); never put secrets there. Secrets only go in the backend's environment.

### Moving to a bigger database setup later

Tables are created automatically on startup (`Base.metadata.create_all`). Once the schema starts changing in production, add [Alembic](https://alembic.sqlalchemy.org/) migrations (`alembic init`, point it at `app.database.Base`) instead of relying on auto-creation.

## Troubleshooting

| Symptom                                          | Fix                                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `npm run setup` says Python 3.11+ not found      | Install Python 3.12 from python.org; on Windows tick "Add python.exe to PATH", then open a new terminal. |
| `npm run setup` says Node is too old             | Install Node 22 LTS from nodejs.org (Vite needs 20.19+ or 22.12+).                                       |
| `Port 5173` / `8000` already in use              | Another copy is still running: close it (Ctrl+C in its terminal) and run `npm run dev` again.            |
| Demo panels say "API offline" locally            | Start the backend on port 8000.                                                                          |
| Browser console shows a CORS error in production | `CORS_ORIGINS` must exactly match the Vercel URL (scheme included, no trailing slash).                   |
| Contact form says the service isn't available    | `VITE_API_URL` wasn't set in Vercel when the site was built: set it and redeploy.                        |
| 3D looks slow on a device                        | Use the **3D On/Off** switch; quality also lowers itself automatically.                                  |
| Case-study URL gives 404 on Vercel               | Ensure the project's Root Directory is `frontend` so `vercel.json` (SPA rewrite) is used.                |
