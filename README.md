# AI Intelligence Universe

An immersive 3D developer portfolio for an **AI Developer · AI Automation Engineer · Full-Stack Developer**. Visitors fly through a holographic universe built with real WebGL geometry: each project is a 3D exhibition connected to a working backend demo.

- **Frontend:** React 19, Vite, Three.js, React Three Fiber, Drei, GSAP (ScrollTrigger), Framer Motion, Tailwind CSS v4
- **Backend:** Python 3.12, FastAPI, Pydantic, SQLAlchemy (SQLite locally, PostgreSQL in production)

## What's inside

| Area | 3D environment | Live functionality |
|---|---|---|
| Opening | Cinematic intro: starfield, holographic globe materialising, camera sweep | Skippable (button / Esc), plays once per session |
| Avalanche Intelligence Platform | Holographic mountain built from a DEM grid, scan beam, survey rings | Slope analysis (Horn's method) and rule-based terrain assessment |
| AI Business Automation Agent | Point-cloud neural core with 4 workflow stages | Runs real triage / sales-summary workflows; 3D replays the step log |
| AI-Enabled Car Sales Platform | Wireframe car showroom, six body types, inventory miniatures | Lead capture, scoring, simulated follow-ups, live pipeline |
| AI Workflow Lab | Five-stage pipeline: collect → process → analyse → decide → output | Inspect each stage, run a packet through the pipeline |
| Skills | Constellation of 8 skill areas linked by shared skills | Skills mapped to the projects that use them |
| About | Identity core, `identity.json` editor panel | Profile from `profile.js` |
| Contact | Transmission beacon | Validated, spam-protected form stored in the database (optional email) |

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
└── render.yaml               Render blueprint (API + PostgreSQL)
```

## 1. Run it locally (Windows PowerShell)

Requirements: Node.js 20+ and Python 3.12.

**Backend** (terminal 1):

```powershell
cd backend
python -m venv .venv                                   # first time only
.venv\Scripts\python -m pip install -r requirements.txt # first time only
Copy-Item .env.example .env                            # first time only
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs · Health: http://localhost:8000/api/health

**Frontend** (terminal 2):

```powershell
cd frontend
npm install      # first time only
npm run dev
```

Open http://localhost:5173. In development the frontend talks to `http://localhost:8000` automatically.

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

### a) Push to GitHub

Create an **empty** repository on GitHub (no README / .gitignore), then:

```powershell
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

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

| Symptom | Fix |
|---|---|
| Demo panels say "API offline" locally | Start the backend on port 8000. |
| Browser console shows a CORS error in production | `CORS_ORIGINS` must exactly match the Vercel URL (scheme included, no trailing slash). |
| Contact form says the service isn't available | `VITE_API_URL` wasn't set in Vercel when the site was built: set it and redeploy. |
| 3D looks slow on a device | Use the **3D On/Off** switch; quality also lowers itself automatically. |
| Case-study URL gives 404 on Vercel | Ensure the project's Root Directory is `frontend` so `vercel.json` (SPA rewrite) is used. |
