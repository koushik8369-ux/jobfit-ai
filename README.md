# JOBFIT AI

JOBFIT AI is an AI-powered job fit and career readiness platform that analyzes a user's profile, resume, skills, and target job requirements to identify job fit and career gaps.

## Active Architecture

```text
React 18 + TypeScript + Vite
          ↓ REST / JWT
Node.js + Express.js
          ↓ Mongoose
MongoDB
```

The active API is in `server/`. The original Spring Boot/MySQL implementation in `backend/` is retained as a migration reference and is not used by the active frontend or Render blueprint. Existing MySQL records are not automatically imported into MongoDB; keep the old database available until a separate data-transfer plan is completed.

## Features

- Registration, login, bcrypt password hashing, JWT authentication, and protected routes
- User profile and dashboard
- Resume Analyzer: PDF, DOCX, DOC, and TXT uploads; evidence-based scoring, extracted profile and resume sections, ATS-style checks, job-market insights, recommendations, and history
- Job Intelligence: deterministic job description analysis, skill matching, recommendations, and history
- Career Assistant conversations grounded in owner-scoped profile, resume, job-fit, market snapshot, and active-plan context; deterministic by default with suggested follow-ups and bounded conversation history in LLM mode
- Resume improvement, skill roadmap, project recommendations, and career action plan
- Project Recommendations refine the existing Career Assistant endpoint with saved skill gaps, role context, existing resume projects, Career Plan alignment, actionable phases, and only available saved market counts; project scope and focus filters are optional
- Interview Preparation uses saved role, resume, job-fit, and Career Plan context for categorized questions, text-based answer-structure feedback, and a mock-interview flow; it does not score technical correctness
- Career plan generation grounded in saved profile, resume, job-fit, and available market-gap evidence, with stage-based tasks, tracked progress, and archival of the previous active plan
- Optional OpenAI-compatible career AI provider; deterministic behavior is the default

All user-owned data is scoped to the authenticated JWT identity. The React application calls Express only; MongoDB credentials remain server-side.

## API

All endpoints use the `/api` prefix. Health, registration, and login are public; all other routes require `Authorization: Bearer <token>`.

| Method | Endpoint |
| --- | --- |
| GET | `/api/health` (backward-compatible liveness response) |
| GET | `/api/health/live` |
| GET | `/api/health/ready` |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |
| GET, PUT | `/api/profile` |
| GET | `/api/dashboard` |
| POST | `/api/resume/analyze` |
| GET | `/api/resume/history` |
| GET | `/api/resume/:id` |
| POST | `/api/job-intelligence/analyze` |
| GET | `/api/job-intelligence/history` |
| GET | `/api/job-intelligence/:id` |
| GET | `/api/jobs/recommended?resumeAnalysisId=<id>&limit=<1-25>` |
| POST, GET | `/api/career-assistant/conversations` |
| GET, POST | `/api/career-assistant/conversations/:conversationId/messages` |
| POST | `/api/career-assistant/action-plan` |
| POST | `/api/career-assistant/resume-improvement` |
| POST | `/api/career-assistant/roadmap` |
| POST | `/api/career-assistant/projects` |
| POST | `/api/career-assistant/interview-preparation` |
| POST | `/api/career-assistant/interview-preparation/feedback` |
| POST | `/api/career-plans` |
| GET | `/api/career-plans/current` |
| GET | `/api/career-plans/:id` |
| PATCH | `/api/career-plans/:id/items/:itemId` |

`POST /api/career-assistant/projects` remains compatible with an empty JSON body. Optional filters are `category` (`BACKEND`, `FRONTEND`, `FULL_STACK`, `AI_ML`, `DATA`, `CLOUD_DEVOPS`, or `GENERAL`), `difficulty` (`BEGINNER`, `INTERMEDIATE`, or `ADVANCED`), and `focusSkill` (a skill already present in the authenticated user's saved context).

Resume analysis accepts multipart form data with a required `file` and optional `targetRole`. Supported types are PDF, DOCX, DOC, and TXT; uploads are limited to 10 MB, content-checked, and processed in memory.

New registrations require passwords of at least 12 characters and no more than 72 UTF-8 bytes (the bcrypt input limit). Login deliberately does not enforce the new minimum, so existing accounts remain compatible. The browser stores JWT sessions in `sessionStorage`; existing `localStorage` sessions are migrated and removed on the next app load. A session is still readable by same-origin JavaScript and is not an XSS-proof replacement for an HttpOnly cookie.

Login and registration each allow 10 attempts per IP per 15-minute window. The limiter uses an in-memory per-process store; use a shared store before scaling the API across multiple instances. API responses include a generated `X-Request-Id`; structured logs contain request method, path, status, duration, and safe error names, but not request bodies, query values, or authorization headers.

Career Assistant conversation and message history accepts `page` (default `1`) and `limit` (default `50`, maximum `100`). Responses remain arrays in chronological order. Each assistant response uses at most the latest 10 previous messages as prompt history. The Mongoose schemas declare compound indexes for these sorted reads; no live production query plan or index state was available, so no index change was made. Verify the deployed indexes and representative query plans before relying on or changing them.

JWTs remain stateless. Logout clears the browser session but cannot revoke an already-issued bearer token; it remains valid until expiration (24 hours by default) or secret rotation. Server-side revocation is deferred because adding it safely requires a persistent `jti` denylist with expiry/cleanup, a logout endpoint, and an authentication check that remains compatible with already-issued JWTs. Treat tokens as valid until their current expiry; implement and integration-test revocation as a separate security change before shortening session lifetimes or promising immediate logout invalidation.

Resume analysis remains behind the existing authenticated endpoints and stores its extracted result in the owner-scoped `resumeanalyses` collection; extracted raw text stays private. Its deterministic ATS-style checklist score is 0–100: contact information (10), summary quality (10), detected skills (up to 15), target-role keyword coverage (10), experience evidence (up to 20), education (up to 10), projects (up to 10), certifications (5), and section completeness (10). This practical checklist is not an official ATS score. Resume Analyzer 2.1 adds role-specific insights through the existing job recommendation service. Market statistics are aggregated from postings returned by the indexed normalized-skill query and cached in memory for five minutes. Known role families use a small role-skill profile; custom role names use role-title matching over postings reached through the detected-resume-skill index, and the response identifies which search basis was used. Role-market skills are included in the comparison when they occur in at least 20% of at least three matching postings; salary ranges require at least five salary-bearing postings in one currency and use the 10th/90th percentile bounds. Skill coverage is matching role-market skills divided by required role-market skills, with no score floor or bonus. Insufficient data is reported explicitly. ATS checks also report action verbs and quantified achievement lines, while weak-bullet rewrites use placeholders that must be verified by the candidate. Role keywords, weak/missing sections, and improvement suggestions are based on parsed resume and available market data. When the job dataset is available, saved analysis also includes ranked job matches and skill gaps from the existing job recommendation service; if it is unavailable, resume analysis still completes with an explicit unavailable status.

MongoDB collections are `users`, `resumeanalyses`, `jobanalyses`, `jobpostings`, `careerassistantconversations`, `careerassistantmessages`, and `careerplans`. Profile data is embedded in `users`; career-plan items are embedded in their plan. ObjectId API values are strings.

### Dataset job recommendations

Job recommendations use the authenticated user's saved resume analysis (`resumeAnalysisId`); client-provided skill lists are not trusted. `GET /api/jobs/recommended` returns at most 10 ranked matches by default and accepts a `limit` from 1 to 25. Jobs are queried from the indexed `jobpostings` collection using normalized resume skills, not by reading the workbook for each request. It returns `503` with an explicit message until the dataset has been imported. The dataset contains no job URL, so recommendations do not include invented apply links.

The `server` package includes a streaming importer for the local Kaggle XLSX file. It skips rows without a title, job ID, or usable skill tags; keeps the first valid row for a duplicate job ID; and upserts the remaining records in batches. A dry run validates the workbook without connecting to MongoDB. Neither the workbook nor converted job data belongs in the repository.

```powershell
npm --prefix server run import:jobs -- --dry-run "C:\path\to\indian-job-market-dataset-2025.xlsx"
npm --prefix server run import:jobs -- "C:\path\to\indian-job-market-dataset-2025.xlsx"
```

The import command uses the server's existing `MONGODB_URI`; do not place credentials in command arguments or source files. It creates a unique dataset/job ID index and a dataset/normalized-skill index.

Each recommendation's match percentage is `70% × skill match + 20% × experience compatibility + 10% × location relevance`. Skill match is the share of the job's listed tags present among detected resume skills after conservative alias normalization. Experience compatibility compares explicit years found in detected resume experience text with the job's minimum years; when either value is unavailable, that component is neutral (50%). Location is a case-insensitive text match between the user's saved profile location and the listed job location; when either is unavailable, that component is neutral (50%). This is deterministic matching, not an AI-generated score.

## Local Development

Requirements: Node.js 24.0 or newer within the Node 24 release line, npm, and a local MongoDB instance or MongoDB Atlas URI. Both packages require `^24.0.0`; CI and Render pin Node 24.22.1.

From `server/`, install dependencies and create a local environment file from the example. Set `MONGODB_URI` to your development database and `JWT_SECRET` to a private random value of at least 32 UTF-8 bytes. Do not commit `.env` files.

```powershell
cd server
npm ci
npm run dev
```

The API defaults to `http://localhost:5000`. The frontend defaults to `http://localhost:5173`; Vite proxies development `/api` calls to Express on port `5000`. Production builds use the configured `VITE_API_BASE_URL`, whose example points to `http://localhost:5000/api`.

Run the frontend in another terminal. Copy `frontend/.env.example` to `.env`; a production build requires an HTTPS `VITE_API_BASE_URL` ending in `/api`.

```powershell
cd frontend
npm ci
npm run dev
```

## AI Provider

`AI_PROVIDER=deterministic` is the default and requires no external AI service. To enable the optional OpenAI-compatible provider, set `AI_PROVIDER=llm` and configure `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, and `LLM_TIMEOUT` as server-side environment variables. The provider calls `/chat/completions`, validates structured JSON results, and does not expose upstream response bodies. Tests use mocked fetch and never call an external LLM.

## Deployment

`render.yaml` defines a Node web service and React static site. It does not create a database. Set `MONGODB_URI` to an externally managed MongoDB deployment (for example, Atlas), `CORS_ALLOWED_ORIGINS` to the exact HTTPS frontend origin, and `VITE_API_BASE_URL` to the HTTPS Express API URL ending in `/api`. The Node service validates MongoDB, JWT, CORS, proxy, and AI-provider configuration before listening; the frontend rejects missing, non-HTTPS production API URLs, credentials, query strings, and paths other than `/api`.

The Node service starts with `npm start`, binds to `0.0.0.0`, and uses Render's `PORT`. Render is configured to trust one proxy hop (`TRUST_PROXY=1`); only change this when the trusted proxy topology is understood. It checks `/api/health/ready` before routing traffic. `/api/health` remains available with its prior response shape, `/api/health/live` is liveness-only, and `/api/health/ready` returns `503` unless MongoDB is connected.

Both Render services use `autoDeployTrigger: checksPass`. Backend and frontend build commands run their tests before starting a deployment; the GitHub Actions workflow runs backend tests (including a dedicated MongoDB service), frontend tests, the production build, and diff checks. No deployment was triggered as part of this work.

The static site CSP is generated with the configured API origin at build time and is supplemented by response headers declared in `render.yaml`. The Docker/Nginx frontend also sends security headers. Render HTTPS termination and redirects provide transport encryption; do not expose the API or MongoDB over plaintext public endpoints.

### Environment variables and secrets

| Variable | Scope | Requirement |
| --- | --- | --- |
| `NODE_VERSION` | Render build/runtime | Render pins `24.22.1` for both services; both package engine ranges are `^24.0.0`. |
| `PORT` | Server | Optional; defaults to `5000`. |
| `MONGODB_URI` | Server secret | Required MongoDB connection string. Never put it in frontend variables, source, or logs. |
| `JWT_SECRET` | Server secret | Required; at least 32 UTF-8 bytes. Rotate using a planned session invalidation because rotating it invalidates issued tokens. |
| `JWT_EXPIRATION` | Server | Optional milliseconds; defaults to `86400000`. |
| `CORS_ALLOWED_ORIGINS` | Server | Required in production; comma-separated exact HTTPS origins, with no wildcard, path, query, or credentials. |
| `TRUST_PROXY` | Server | Defaults to `0` (disabled); Render sets `1` for its single trusted proxy hop. |
| `AI_PROVIDER` | Server | `deterministic` by default, or `llm`. |
| `LLM_API_KEY` | Server secret | Required only when `AI_PROVIDER=llm`; keep it server-side. |
| `LLM_BASE_URL` | Server | Optional for the LLM provider; defaults to the OpenAI-compatible endpoint. |
| `LLM_MODEL` | Server | Optional; defaults to `gpt-4o-mini`. |
| `LLM_TIMEOUT` | Server | Optional request timeout; defaults to `30s`. |
| `VITE_API_BASE_URL` | Frontend build | Required; HTTPS API URL ending in `/api`. It is public build configuration, not a secret. |

Store secrets in Render's environment-variable settings or a local ignored `.env`; never commit or print their values. Keep `AI_PROVIDER=deterministic` unless an LLM key and provider are intentionally configured.

### Operational checks and rollback

After an approved deployment, verify `GET /api/health/live` returns `200` and `GET /api/health/ready` returns `200` with `database: "connected"`. Confirm the frontend can reach the API from its deployed origin, then exercise login, dashboard, and application tracking. Correlate safe JSON logs by `X-Request-Id`; do not log request bodies or tokens.

For rollback, use Render's dashboard to redeploy the last known-good service versions, then verify both health endpoints and the critical user flows. Keep MongoDB backups and avoid destructive database changes; this release adds no schema migration or production index. Prefer a forward fix if an incompatible schema change is ever introduced.

## Validation

Run backend and frontend tests and the production build:

```powershell
npm --prefix server ci
npm --prefix server test
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
```

Backend unit/API tests use injected fake models and mocked LLM calls. The real-Mongoose integration test uses `MONGODB_TEST_URI` only when it points to a local MongoDB instance, always selects the isolated `jobfit_ai_integration_test` database, and otherwise is reported as skipped. CI provides its own MongoDB service; no production credentials are used.