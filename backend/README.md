# Football Tournament Platform - Backend

## Prerequisites

- Python 3.11+
- PostgreSQL 14+

## Local Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials:
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/tournament
# JWT_SECRET=your-secure-secret-key

# Run migrations (after PostgreSQL is running)
alembic upgrade head

# Start server
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL async URL | required |
| JWT_SECRET | Secret for JWT signing | required |
| JWT_ALG | JWT algorithm | HS256 |
| ACCESS_TOKEN_MINUTES | Token validity | 10080 (7 days) |
| CORS_ORIGINS | Comma-separated origins | http://localhost:5173 |

## API Endpoints

All endpoints are prefixed with `/api`.

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get access token
- `GET /api/auth/me` - Get current user

### Protected (require Bearer token)

**Organisers**
- `POST /api/organisers` - Create organiser
- `GET /api/organisers` - List my organisers
- `GET /api/organisers/{id}` - Get organiser
- `PATCH /api/organisers/{id}` - Update (or soft delete with `{deleted: true}`)

**Tournaments**
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments?organiser_id=...` - List tournaments
- `GET /api/tournaments/{id}` - Get tournament
- `PATCH /api/tournaments/{id}` - Update

**Editions**
- `POST /api/editions` - Create edition
- `GET /api/editions?tournament_id=...` - List editions
- `GET /api/editions/{id}` - Get edition
- `PATCH /api/editions/{id}` - Update
- `GET /api/editions/{id}/alive-teams` - Teams that haven't lost

**Teams**
- `POST /api/teams` - Create team
- `GET /api/teams?edition_id=...` - List teams
- `PATCH /api/teams/{id}` - Update
- `POST /api/teams/{id}/delete` - Soft delete

**Players**
- `POST /api/players` - Create player
- `GET /api/players?team_id=...` - List players
- `PATCH /api/players/{id}` - Update
- `POST /api/players/{id}/delete` - Soft delete

**Matches**
- `POST /api/matches` - Create match
- `GET /api/matches?edition_id=...` - List matches
- `PATCH /api/matches/{id}` - Update score/status
- `POST /api/matches/{id}/delete` - Soft delete

**Match Events**
- `POST /api/match-events` - Create event
- `GET /api/match-events?match_id=...` - List events
- `PATCH /api/match-events/{id}` - Update
- `POST /api/match-events/{id}/delete` - Soft delete

### Public (no auth)
- `GET /api/public/tournaments/search?q=...` - Search tournaments
- `GET /api/public/tournaments/{id}` - Tournament with editions
- `GET /api/public/editions/{id}` - Edition details
- `GET /api/public/editions/{id}/fixtures` - Match list
- `GET /api/public/editions/{id}/teams` - Team list
- `GET /api/public/editions/{id}/topscorers` - Goal scorers
- `GET /api/public/editions/{id}/discipline` - Cards
- `GET /api/public/matches/{id}` - Match details
- `GET /api/public/matches/{id}/events` - Match timeline
- `GET /api/public/teams/{id}/players` - Team squad
