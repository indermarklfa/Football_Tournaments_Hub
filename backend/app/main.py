"""FastAPI main application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.settings import get_settings
from app.routers import auth, organisers, tournaments, editions, teams, matches, match_events, public

settings = get_settings()

app = FastAPI(title="Football Tournament Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(organisers.router)
app.include_router(tournaments.router)
app.include_router(editions.router)
app.include_router(teams.router)
app.include_router(matches.router)
app.include_router(match_events.router)
app.include_router(public.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
