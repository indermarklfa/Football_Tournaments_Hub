# PitchBase — Session Handoff Document
*Paste this at the start of every new chat session*

---

## Project Identity
- **Platform:** PitchBase — multi-tenant grassroots football platform for Southern Africa
- **Stack:** FastAPI + async SQLAlchemy 2.0 + PostgreSQL + Alembic (backend) / React + Tailwind (frontend)
- **Repo root:** `C:\Users\bashi\Documents\Football_Tournaments_Hub`
- **VS Code:** Opened at root (backend and frontend both visible)
- **Terminal:** PowerShell
- **Python venv:** `.venv` at root — activate with: `& .venv\Scripts\Activate.ps1`
- **Database:** PostgreSQL on `localhost:5433`, database name `pitchbase`
- **DB credentials:** user `postgres`, password `postgres`
- **Backend runs from:** `backend\` folder on port 8000
- **Frontend runs from:** `frontend\` folder on port 3000

---

## Working Style
- I have little coding experience — never assume I know things
- Always walk me through everything clearly
- Work step by step so we can debug as we go
- Use Claude Code for file creation and editing tasks
- Use PowerShell terminal commands for migrations, server starts, and verification
- Paste terminal results back for confirmation before moving on

---

## Current State (as of Session 2 end)

### Database
- 15 tables live in `pitchbase` database
- Latest migration: `002_add_divisions` ✅
- Tables: `alembic_version`, `clubs`, `competitions`, `divisions`, `group_teams`, `groups`, `match_events`, `matches`, `media_posts`, `memberships`, `organizations`, `player_registrations`, `players`, `seasons`, `teams`

### Backend
- Running on FastAPI, port 8000
- All routers working: `auth`, `organizations`, `competitions`, `seasons`, `clubs`, `teams`, `players`, `matches`, `match_events`, `groups`, `public`, `admin`, `uploads`
- Models file: `backend/schema/models.py` — contains all models including new `Division` and `AgeGroup`
- Alembic migrations in: `backend/alembic/versions/`

### Frontend
- Running on React, port 3000
- All API calls updated in `frontend/src/lib/api.js`
- All admin pages updated to use new entity names
- Branding updated throughout — PitchBase everywhere
- Public routes: `/competitions/:id`, `/seasons/:id`, `/matches/:id`
- Admin routes: `/admin/competitions/new`, `/admin/seasons/:id/teams`, etc.

### Test User
- Email: `admin@pitchbase.co.za`
- Password: `Test1234!`
- Role: `admin` (platform admin)
- Has organization: `Indermark FC` (slug: `indermark-fc`)
- Has competition: `Indermark Cup`
- Has season: `Indermark Cup 2026`

---

## Entity Rename Map (old → new)
| Old | New |
|-----|-----|
| Organiser | Organization |
| Tournament | Competition |
| Edition | Season |
| `edition_id` | `season_id` |
| `tournament_id` | `competition_id` |
| `organiser_id` | `organization_id` |
| `players.team_id` | `players.club_id` |

---

## Architecture (Blueprint Summary)
```
Organization (multi-tenant root)
└── Competition (e.g. Indermark Cup)
    └── Season (e.g. 2026)
        ├── Division — U13 League (format: league, age_group: u13)
        ├── Division — U15 League (format: league, age_group: u15)
        ├── Division — U17 League (format: league, age_group: u17)
        └── Division — Open League (format: groups_knockout, age_group: open)
            ├── Teams (linked via division_id)
            ├── Groups (linked via division_id)
            └── Matches (linked via division_id)

Club (persistent football club, linked to organization)
└── Team (season+division specific, linked to club)
    └── PlayerRegistration (player linked to team+season+division)
        └── Player (persistent profile, linked to club)
```

---

## Phase Completion Status

### Phase 1 — Foundation ✅ COMPLETE
- Organizations, competitions, seasons, clubs
- Player registrations
- Memberships (scoped roles)
- Venues table
- Fresh database, all migrations run

### Frontend Migration ✅ COMPLETE
- All API calls updated
- All admin pages updated
- Branding updated (PitchBase throughout)
- Both dashboards working
- Public pages working

### Phase 2 — Core Operations 🔴 IN PROGRESS
**Next task: Divisions Router**

The `divisions` table exists in the database (migration 002 complete).
The `Division` and `AgeGroup` models exist in `backend/schema/models.py`.
`Division` and `AgeGroup` are exported from `backend/schema/__init__.py` and `backend/app/models.py`.

**What still needs to be built for Phase 2:**
1. `backend/app/routers/divisions.py` — CRUD for divisions
2. Wire `divisions` router into `backend/app/main.py`
3. Update `teams.py` router — teams now belong to a division, not just a season
4. Update `matches.py` router — matches now belong to a division
5. Update `groups.py` router — groups now belong to a division
6. Standings engine — compute league table per division from match results
7. Frontend — division management UI (create divisions, assign teams to divisions)
8. Frontend — standings table display per division
9. Officials table and router (Phase 2 later)
10. Lineups table and router (Phase 2 later)
11. Discipline actions (Phase 2 later)

---

## Key Business Rules (from Blueprint)
1. A club can have multiple teams in the same season (different divisions)
2. A player registers to a team per season — not permanently attached
3. Registration ≠ Eligibility (future feature)
4. Standings derive from match results — never manually entered
5. Development leagues (U13, U15, U17) use pure league format (everyone plays everyone)
6. Open league uses groups_knockout format
7. All important changes should eventually be auditable

---

## File Locations Quick Reference
| What | Where |
|------|-------|
| SQLAlchemy models | `backend/schema/models.py` |
| Model exports | `backend/schema/__init__.py` and `backend/app/models.py` |
| All routers | `backend/app/routers/` |
| Main app wiring | `backend/app/main.py` |
| Alembic migrations | `backend/alembic/versions/` |
| Frontend API client | `frontend/src/lib/api.js` |
| Frontend pages | `frontend/src/pages/` |
| Frontend routing | `frontend/src/App.js` |
| Environment config | `backend/.env` |

---

## How to Start Each Session
1. Open VS Code at `C:\Users\bashi\Documents\Football_Tournaments_Hub`
2. Open PowerShell terminal and run: `& .venv\Scripts\Activate.ps1`
3. Start backend: `cd backend` then `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
4. Open a second terminal, start frontend: `cd frontend` then `npm start`
5. Test health: `Invoke-RestMethod -Uri http://localhost:8000/api/health`
6. Paste this document at the start of the new chat