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
- I want bulk edits, lets not waste credits
- Always walk me through everything clearly
- Work efficiently to save Claude credit limits
- Use Claude Code for file creation and editing tasks
- Use PowerShell terminal commands for migrations, server starts, and verification

---

## How to Start Each Session
1. Open VS Code at `C:\Users\bashi\Documents\Football_Tournaments_Hub`
2. Open PowerShell terminal and run: `& .venv\Scripts\Activate.ps1`
3. Start backend: `cd backend` then `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
4. Open a second terminal, start frontend: `cd frontend` then `npm start`
5. Test health: `Invoke-RestMethod -Uri http://localhost:8000/api/health`
6. Paste this document at the start of the new chat

---

## Test User
- Email: `admin@pitchbase.co.za`
- Password: `Test1234!`
- Role: `admin` (platform admin)
- No organization yet — needs to be created fresh this session

---

## Current State (as of Session 4 end)

### What was done this session
1. Deleted the obsolete `EditionTeams` page and removed all links to it
2. Completed a full database schema redesign based on the PitchBase Blueprint
3. Added `football_structures` table for SAFA → Province → Region → LFA → Stream hierarchy
4. Added `users` and `memberships` auth tables back (they were accidentally dropped)
5. Ran clean migration — all 19 tables created successfully
6. Rewrote all backend routers to match new schema
7. Fixed enum casing bug (`UserRole` values must be lowercase to match PostgreSQL)
8. Backend starts clean, health check passes, login works

### Database
- 19 tables live in `pitchbase` database
- Latest migration: `001_initial_schema` ✅
- All old migrations deleted and replaced with one clean initial schema

### Backend
- Running on FastAPI, port 8000
- All routers rewritten and working
- Old `.old` router files left in place (can be deleted next session)

### Frontend
- Still running on old schema references — **not yet updated this session**
- Will break on most pages until routers and API calls are updated
- Login page should still work (auth endpoints unchanged)

---

## Database Architecture

### 19 Tables across 5 layers

```
Layer 1 — Persistent Entities
  users, organizations, competitions, seasons, divisions
  clubs, players, venues, football_structures

Layer 2 — Player/Club Relationships
  club_player_memberships, transfers

Layer 3 — Competition Participation
  teams, player_registrations, groups, group_teams, memberships

Layer 4 — Match Operations
  matches, match_lineups, match_events

Layer 5 — Content
  media_posts
```

### Architecture diagram
```
Organization (multi-tenant root, owned by a user)
└── Competition (e.g. Indermark Development League)
    └── Season (e.g. 2026)
        └── Division (e.g. U13 League — format: league, age_group: u13)
            ├── Teams (club entry into division — UNIQUE per club+division)
            │   └── PlayerRegistrations (player eligible for this team)
            ├── Groups (for group stage divisions)
            └── Matches → MatchLineups + MatchEvents

Club (persistent, linked to organization)
└── ClubPlayerMembership (time-based — player belongs to club from/to date)
    └── Transfer (explicit business event when player moves clubs)

Player (global entity — no permanent club attachment)
└── PlayerRegistration (registered to a team for a season)
    └── MatchLineup (actually played in a match)
        └── MatchEvent (goal, card, sub, etc.)

FootballStructure (SAFA governance hierarchy)
  SAFA National → Province → Region → LFA → Stream
  - clubs.home_structure_id → their LFA/Stream
  - competitions.host_structure_id → where competition sits
```

### Key business rules
1. A player is a global entity — not permanently owned by any club
2. Club membership is time-based via `club_player_memberships`
3. A team = one club entry into one division (UNIQUE club_id + division_id)
4. A club can have multiple teams in the same season across different divisions
5. A player can register for multiple teams in the same club in the same season
6. Player registration ≠ match participation (separate tables)
7. Standings are always derived from match results — never manually entered
8. Divisions are season-specific — historical queries use `age_group` field

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
| `players.name` | `players.first_name + last_name` |
| `players.team_id` | Removed — players are global |
| `teams.edition_id` | `teams.division_id` |
| `matches.edition_id` | `matches.division_id` |
| `matches.kickoff_datetime` | `matches.kickoff_at` |
| `groups.edition_id` | `groups.division_id` |

---

## Active Routers (backend/app/routers/)
| File | Prefix | Status |
|------|--------|--------|
| auth.py | /api/auth | ✅ Working |
| organizations.py | /api/organizations | ✅ Rewritten |
| competitions.py | /api/competitions | ✅ Rewritten |
| seasons.py | /api/seasons | ✅ Rewritten |
| divisions.py | /api/divisions | ✅ Rewritten |
| clubs.py | /api/clubs | ✅ Rewritten |
| teams.py | /api/teams | ✅ Rewritten |
| players.py | /api/players | ✅ Rewritten |
| matches.py | /api/matches | ✅ Rewritten |
| match_events.py | /api/match-events | ✅ Rewritten |
| groups.py | /api/groups | ✅ Rewritten |
| player_registrations.py | /api/player-registrations | ✅ New |
| admin.py | /api/admin | ✅ Rewritten |
| public.py | /api/public | ✅ Rewritten |

---

## Next Session Tasks (Priority Order)

### 1. Frontend — update API calls (frontend/src/lib/api.js)
All API function names and endpoints need updating to match new router URLs and field names.

### 2. Frontend — update all admin pages
Every admin page references old entity names. Pages to update:
- Dashboard
- OrganisationDashboard (was OrganiserDashboard)
- CompetitionDetail (was TournamentDetail)
- SeasonDetail (was EditionDetail)
- DivisionList, NewDivision, EditDivision
- DivisionTeams — main way to add teams (pick club → creates team in division)
- DivisionMatches — new division-aware match creation
- ClubList, NewClub
- PlayerList — players are now global, searchable
- MatchDetail — lineups + events

### 3. Frontend — update public pages
- CompetitionPage (was TournamentPage)
- SeasonPage (was EditionPage)
- MatchPage

### 4. Seed test data
Once frontend is connected, create:
- Organization: Indermark FC
- Competition: Indermark Development League
- Season: 2026
- Divisions: U13 League, U15 League, U17 League, Open League
- Clubs: All Stars FC, Sunrise FC
- FootballStructure: SAFA → Limpopo → Capricorn Region → Blouberg LFA → Indermark Stream

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

