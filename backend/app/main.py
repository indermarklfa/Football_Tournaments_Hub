"""FastAPI main application - PitchBase Platform"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.settings import get_settings
from app.routers import (
    auth,
    organizations,
    competitions,
    seasons,
    clubs,
    teams,
    players,
    matches,
    match_events,
    groups,
    public,
    admin,
    uploads,
)

settings = get_settings()

os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="PitchBase Football Platform",
    version="2.0.0",
    description="Multi-tenant grassroots football platform for Southern Africa",
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(organizations.router, prefix="/api")
app.include_router(competitions.router, prefix="/api")
app.include_router(seasons.router, prefix="/api")
app.include_router(clubs.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(players.router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(match_events.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(public.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(uploads.router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "platform": "PitchBase",
        "version": "2.0.0",
    }
