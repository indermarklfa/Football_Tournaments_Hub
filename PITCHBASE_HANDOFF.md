Here is the updated handover doc reflecting the work completed in this session.

---

# PitchBase — Session Handoff Document

*Paste this at the start of every new chat session*

---

## Project Identity

* **Platform:** PitchBase — multi-tenant grassroots football platform for Southern Africa
* **Stack:** FastAPI + async SQLAlchemy 2.0 + PostgreSQL + Alembic (backend) / React + Tailwind (frontend)
* **Repo root:** `C:\Users\bashi\Documents\Football_Tournaments_Hub`
* **VS Code:** Opened at root (backend and frontend both visible)
* **Terminal:** PowerShell
* **Python venv:** `.venv` at root — activate with: `& .venv\Scripts\Activate.ps1`
* **Database:** PostgreSQL on `localhost:5433`, database name `pitchbase`
* **DB credentials:** user `postgres`, password managed locally via `pgpass.conf`
* **Backend runs from:** `backend\` folder on port 8000
* **Frontend runs from:** `frontend\` folder on port 3000

---

## Working Style

* I want bulk edits, lets not waste credits
* Always walk me through everything clearly
* Work efficiently to save Claude credit limits
* Use PowerShell terminal commands for migrations, server starts, and verification
* Do not redesign working parts unnecessarily
* Prefer additive, migration-safe changes only

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

* Email: `admin@pitchbase.co.za`
* Password: `Test1234!`
* Role: `admin` (platform admin)

---

## Current State (updated after latest backend hardening)

### What was done recently

1. Applied new Alembic migration `002_schema_improvements`
2. Added team snapshot fields:

   * `age_group_snapshot`
   * `gender_snapshot`
   * `division_name_snapshot`
3. Extended `event_type` enum with:

   * `assist`
   * `penalty_shootout_scored`
   * `penalty_shootout_missed`
4. Added DB check constraints for:

   * non-negative match scores
   * valid club membership dates
   * valid registration dates
   * squad/shirt number ranges
   * event minute / extra minute ranges
   * lineup minute on/off ranges
5. Added async backend validation service at:

   * `backend/app/services/validation.py`
6. Wired validation into create flows for:

   * teams
   * player registrations
   * matches
   * match events
7. Added `IntegrityError` handling across routers to reduce raw DB-driven `500`s
8. Verified key rules with real data through Swagger and live backend tests

---

## Database

* 19 base tables from `001_initial_schema`
* Additional schema hardening from `002_schema_improvements`
* Latest migration head: `002`

### Important migration files

* `backend/alembic/versions/001_initial_schema.py`
* `backend/alembic/versions/002_schema_improvements.py`

---

## Backend

* Running on FastAPI, port 8000
* Async SQLAlchemy session usage
* Core routers rewritten and working
* Validation service now exists and is in active use
* Major create flows tested successfully
* Duplicate/conflict scenarios now return cleaner `409` responses in patched routes

---

## Frontend

* Still not fully updated to the new schema/entity names
* Login works
* Many pages still need alignment with new backend fields and endpoints

---

## Database Architecture

### 19 Tables across 5 layers

```text
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

```text
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
        └── MatchEvent (goal, card, sub, assist, etc.)

FootballStructure (SAFA governance hierarchy)
  SAFA National → Province → Region → LFA → Stream
  - clubs.home_structure_id → their LFA/Stream
  - competitions.host_structure_id → where competition sits
```

---

## Key Business Rules

1. A player is a global entity — not permanently owned by any club
2. Club membership is time-based via `club_player_memberships`
3. A team = one club entry into one division (`UNIQUE club_id + division_id`)
4. A club can have multiple teams in the same season across different divisions
5. A player can register for multiple teams in the same season **only within the same club**
6. Player registration ≠ match participation (separate tables)
7. Standings are always derived from match results — never manually entered
8. Divisions are season-specific — historical queries use `age_group` field
9. If a division has age limits, player DOB is required for registration
10. Match teams must belong to the same division as the match
11. If `group_id` is supplied on a match, both teams must belong to that group
12. Match event player must be registered to that team
13. Team snapshot fields are copied from division on creation and remain stable

---

## Verified Working Scenarios

These were tested successfully against the live backend:

* creating a team populates snapshot fields
* duplicate team in same club/division is blocked
* creating player registrations works
* duplicate player registration to same team is blocked
* same-season cross-club player registration is blocked
* same-season same-club multi-team registration is allowed
* creating a valid match works
* creating match events works
* new event type `assist` works

---

## Schema Improvements from Migration 002

### New Team Fields

On `teams`:

* `age_group_snapshot`
* `gender_snapshot`
* `division_name_snapshot`

### New Match Event Types

On `event_type` enum:

* `assist`
* `penalty_shootout_scored`
* `penalty_shootout_missed`

### New/Updated Constraints

* `ck_match_scores_non_negative`
* `ck_membership_dates_valid`
* `ck_registration_dates_valid`
* `ck_registration_squad_number_range`
* `ck_lineup_shirt_number_range`
* `ck_event_minute_range`
* `ck_event_extra_minute_range`
* `ck_lineup_minute_on_range`
* `ck_lineup_minute_off_range`

### Player ID Uniqueness

* Partial unique index added on `players.id_number` for active, non-deleted players

---

## Validation Service

File:

* `backend/app/services/validation.py`

Functions:

* `populate_team_snapshots`
* `validate_registration_creation`
* `validate_match_teams`
* `validate_lineup_creation`
* `validate_event_creation`

Note:

* validation service is async and built for `AsyncSession`

---

## Active Routers (backend/app/routers/)

| File                    | Prefix                    | Status                          |
| ----------------------- | ------------------------- | ------------------------------- |
| auth.py                 | /api/auth                 | ✅ Working                       |
| organizations.py        | /api/organizations        | ✅ Rewritten                     |
| competitions.py         | /api/competitions         | ✅ Rewritten                     |
| seasons.py              | /api/seasons              | ✅ Rewritten                     |
| divisions.py            | /api/divisions            | ✅ Rewritten                     |
| clubs.py                | /api/clubs                | ✅ Rewritten                     |
| teams.py                | /api/teams                | ✅ Rewritten + conflict handling |
| players.py              | /api/players              | ✅ Rewritten                     |
| matches.py              | /api/matches              | ✅ Rewritten + validation        |
| match_events.py         | /api/match-events         | ✅ Rewritten + validation        |
| groups.py               | /api/groups               | ✅ Rewritten                     |
| player_registrations.py | /api/player-registrations | ✅ Active + validation           |
| admin.py                | /api/admin                | ✅ Rewritten                     |
| public.py               | /api/public               | ✅ Rewritten                     |

---

## Error Handling State

* Important write routes now catch `IntegrityError`
* Goal is to return `409` conflicts instead of raw DB `500`s
* `teams.py` and `player_registrations.py` have specific user-friendly conflict messages
* Other routers were also patched more generically

Still worth improving later:

* central/global exception handling for `IntegrityError`
* central/global exception handling for `ValidationError`

---

## Entity Rename Map (old → new)

| Old                        | New                              |
| -------------------------- | -------------------------------- |
| Organiser                  | Organization                     |
| Tournament                 | Competition                      |
| Edition                    | Season                           |
| `edition_id`               | `season_id`                      |
| `tournament_id`            | `competition_id`                 |
| `organiser_id`             | `organization_id`                |
| `players.name`             | `players.first_name + last_name` |
| `players.team_id`          | Removed — players are global     |
| `teams.edition_id`         | `teams.division_id`              |
| `matches.edition_id`       | `matches.division_id`            |
| `matches.kickoff_datetime` | `matches.kickoff_at`             |
| `groups.edition_id`        | `groups.division_id`             |

---

## Next Session Tasks (Priority Order)

### 1. Frontend — update API calls

File:

* `frontend/src/lib/api.js`

Needs:

* endpoint alignment
* field-name alignment
* new player registration / match event flows

### 2. Frontend — update all admin pages

Pages likely needing work:

* Dashboard
* OrganisationDashboard / OrganizationDashboard
* CompetitionDetail
* SeasonDetail
* DivisionList / NewDivision / EditDivision
* DivisionTeams
* DivisionMatches
* ClubList / NewClub
* PlayerList
* MatchDetail

### 3. Frontend — update public pages

* CompetitionPage
* SeasonPage
* MatchPage

### 4. Improve API polish

* add cleaner specific conflict messages in more routers
* centralize exception handling
* possibly add lineup router back from `.old` files and wire validation there too

### 5. Seed / expand test data

Current data exists and has already been used for backend testing, but can be expanded for fuller frontend testing.

---

## File Locations Quick Reference

| What                | Where                                                    |
| ------------------- | -------------------------------------------------------- |
| SQLAlchemy models   | `backend/schema/models.py`                               |
| Model exports       | `backend/schema/__init__.py` and `backend/app/models.py` |
| Validation service  | `backend/app/services/validation.py`                     |
| All routers         | `backend/app/routers/`                                   |
| Main app wiring     | `backend/app/main.py`                                    |
| Alembic migrations  | `backend/alembic/versions/`                              |
| Frontend API client | `frontend/src/lib/api.js`                                |
| Frontend pages      | `frontend/src/pages/`                                    |
| Frontend routing    | `frontend/src/App.js`                                    |
| Environment config  | `backend/.env`                                           |

---

## Useful Commands

### Start backend

```powershell
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Check Alembic version

```powershell
psql -U postgres -p 5433 -d pitchbase -c "SELECT version_num FROM alembic_version;"
```

### Run backend health check

```powershell
Invoke-RestMethod -Uri http://localhost:8000/api/health
```

### List teams

```powershell
psql -U postgres -p 5433 -d pitchbase -c "SELECT id, display_name, club_id, division_id FROM public.teams;"
```

### List player registrations

```powershell
psql -U postgres -p 5433 -d pitchbase -c "SELECT id, player_id, team_id, status FROM public.player_registrations;"
```

---

If you want, I can also turn this into a shorter **Claude-efficient version** that keeps only the most important context.


**Architecture note — clubs should become global entities**

Current schema has clubs.organization_id, which makes a club belong to one organization/tenant in PitchBase.

This is acceptable for the current early build because it simplifies:
- tenant scoping
- admin permissions
- club management per organizer

However, it is not the best long-term football model.

Real-world requirement:
A club like All Stars FC can:
- affiliate through SAFA / BLFA / stream structures
- enter competitions hosted by Indermark Stream
- enter tournaments hosted by independent organizers
- later gain promotion and compete in a regional league
- remain the same club across all these contexts

Therefore, long-term design direction should be:
- Club = global persistent football entity
- Organization = competition host / tenant / manager
- Competition belongs to organization
- Team = club entry into a season/division
- Club participation in an organization context should happen through competition/team participation, not permanent club ownership

Possible future redesign:
1. remove clubs.organization_id as a permanent ownership field
2. keep clubs as global entities
3. optionally add an association table if needed, e.g. organization_clubs:
   - organization_id
   - club_id
   - relationship_type / status
4. continue using teams as the actual participation link into divisions and competitions

Decision:
Do not change this immediately during the current frontend-alignment session.
Keep current schema for now, but treat this as an important future backend architecture improvement.