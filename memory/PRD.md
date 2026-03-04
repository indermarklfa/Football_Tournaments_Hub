# Football Tournament Platform - PRD

## Original Problem Statement
Multi-tenant football tournament platform with:
- Admin UI: register/login, create organiser/tournament/edition, add teams, create matches, update scores, capture events
- Public UI: search tournaments, view fixtures, match timeline, top scorers, discipline

## Architecture
- **Backend**: FastAPI + async SQLAlchemy 2.0 + PostgreSQL + Alembic + JWT auth
- **Frontend**: React + Tailwind + Axios + React Router

## What's Been Implemented (2026-03-04)

### Backend
- PostgreSQL schema (11 tables) + SQLAlchemy models
- JWT authentication (register/login/me)
- CRUD routers: organisers, tournaments, editions, teams, players, matches, match_events
- Public endpoints: search, fixtures, top scorers, discipline, match timeline
- Alembic migration setup (raw SQL)

### Frontend
- React app with routing
- Auth context with token storage
- Admin pages: Login, Register, Dashboard, NewOrganiser, NewTournament, TournamentDetail, NewEdition, EditionTeams, EditionMatches, MatchEvents
- Public pages: Home (search), TournamentPage, EditionPage, MatchPage
- Navbar with Public/Admin navigation

## Core Requirements
- Tournaments with 16-32 teams
- Group stage + knockout progression
- Historical archives of all editions
- Live match updates
- Manual match creation (live draws)

## Prioritized Backlog

### P0 (Core - Done)
- [x] Schema design
- [x] Auth system
- [x] CRUD endpoints
- [x] Admin UI
- [x] Public UI

### P1 (Next Phase)
- [ ] PostgreSQL deployment
- [ ] Groups CRUD & group team assignments
- [ ] Group standings calculation
- [ ] Bracket visualization

### P2 (Future)
- [ ] Real-time updates (WebSocket)
- [ ] Image upload for logos
- [ ] Email notifications
- [ ] Mobile-optimized views
