"""Public endpoints (no auth)"""
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db import get_db
from app.models import Tournament, Edition, Team, Match, Organiser
from app.schemas.public import PublicTournamentResponse, PublicEditionResponse, PublicTeamResponse, PublicFixtureResponse

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/tournaments/search", response_model=list[PublicTournamentResponse])
async def search_tournaments(q: Optional[str] = None, location: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Tournament, Organiser.name.label("org_name"), Organiser.location.label("org_loc")).join(Organiser).where(Tournament.deleted_at.is_(None), Organiser.deleted_at.is_(None))
    if q:
        query = query.where(Tournament.name.ilike(f"%{q}%"))
    if location:
        query = query.where(Organiser.location.ilike(f"%{location}%"))
    result = await db.execute(query.limit(50))
    rows = result.all()
    return [
        PublicTournamentResponse(
            id=r.Tournament.id,
            name=r.Tournament.name,
            description=r.Tournament.description,
            logo_url=r.Tournament.logo_url,
            organiser_name=r.org_name,
            organiser_location=r.org_loc,
        )
        for r in rows
    ]


@router.get("/editions/{edition_id}", response_model=PublicEditionResponse)
async def get_public_edition(edition_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Edition, Tournament.name.label("t_name")).join(Tournament).where(Edition.id == edition_id, Edition.deleted_at.is_(None))
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Edition not found")
    e = row.Edition
    return PublicEditionResponse(
        id=e.id,
        tournament_id=e.tournament_id,
        tournament_name=row.t_name,
        name=e.name,
        year=e.year,
        start_date=e.start_date,
        end_date=e.end_date,
        venue=e.venue,
        format=e.format.value,
        status=e.status.value,
    )


@router.get("/editions/{edition_id}/teams", response_model=list[PublicTeamResponse])
async def get_public_teams(edition_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.edition_id == edition_id, Team.deleted_at.is_(None)))
    return result.scalars().all()


@router.get("/editions/{edition_id}/fixtures", response_model=list[PublicFixtureResponse])
async def get_public_fixtures(edition_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Match).where(Match.edition_id == edition_id, Match.deleted_at.is_(None)).order_by(Match.kickoff_datetime.asc().nullslast())
    )
    matches = result.scalars().all()
    team_ids = {m.home_team_id for m in matches} | {m.away_team_id for m in matches}
    if team_ids:
        teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
        teams = {t.id: t.name for t in teams_result.scalars().all()}
    else:
        teams = {}
    return [
        PublicFixtureResponse(
            id=m.id,
            stage=m.stage.value,
            matchday=m.matchday,
            kickoff_datetime=m.kickoff_datetime,
            venue=m.venue,
            home_team_id=m.home_team_id,
            home_team_name=teams.get(m.home_team_id),
            away_team_id=m.away_team_id,
            away_team_name=teams.get(m.away_team_id),
            home_score=m.home_score,
            away_score=m.away_score,
            status=m.status.value,
        )
        for m in matches
    ]
