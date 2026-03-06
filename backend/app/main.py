"""FastAPI main application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.settings import get_settings
from app.routers import auth, organisers, tournaments, editions, teams, players, matches, match_events, public, groups

settings = get_settings()

app = FastAPI(title="Football Tournament Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(organisers.router, prefix="/api")
app.include_router(tournaments.router, prefix="/api")
app.include_router(editions.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(players.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(match_events.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(public.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
