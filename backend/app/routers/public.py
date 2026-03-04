"""Public endpoints (no auth)"""
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer
from sqlalchemy.orm import selectinload
from app.db import get_db
from app.models import Tournament, Edition, Team, Match, Organiser, MatchEvent, MatchStatus, EventType, Player
from app.schemas.public import (
    PublicTournamentResponse, PublicEditionResponse, PublicTeamResponse, PublicFixtureResponse,
    PublicMatchEventResponse, TopScorerResponse, DisciplineResponse
)

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


@router.get("/matches/{match_id}/events", response_model=list[PublicMatchEventResponse])
async def get_match_events(match_id: UUID, db: AsyncSession = Depends(get_db)):
    match_result = await db.execute(select(Match).where(Match.id == match_id, Match.deleted_at.is_(None)))
    if not match_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Match not found")
    result = await db.execute(
        select(MatchEvent)
        .where(MatchEvent.match_id == match_id, MatchEvent.deleted_at.is_(None))
        .order_by(MatchEvent.minute.asc(), MatchEvent.created_at.asc())
    )
    events = result.scalars().all()
    team_ids = {e.team_id for e in events}
    player_ids = {e.player_id for e in events if e.player_id}
    teams = {}
    players = {}
    if team_ids:
        t_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
        teams = {t.id: t.name for t in t_result.scalars().all()}
    if player_ids:
        p_result = await db.execute(select(Player).where(Player.id.in_(player_ids)))
        players = {p.id: p.name for p in p_result.scalars().all()}
    return [
        PublicMatchEventResponse(
            id=e.id,
            team_id=e.team_id,
            team_name=teams.get(e.team_id),
            player_id=e.player_id,
            player_name=players.get(e.player_id) if e.player_id else None,
            event_type=e.event_type.value,
            minute=e.minute,
        )
        for e in events
    ]


@router.get("/editions/{edition_id}/topscorers", response_model=list[TopScorerResponse])
async def get_top_scorers(edition_id: UUID, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            MatchEvent.player_id,
            Player.name.label("player_name"),
            Player.team_id,
            Team.name.label("team_name"),
            func.count(MatchEvent.id).label("goals"),
        )
        .join(Match, MatchEvent.match_id == Match.id)
        .join(Player, MatchEvent.player_id == Player.id)
        .join(Team, Player.team_id == Team.id)
        .where(
            Match.edition_id == edition_id,
            Match.status == MatchStatus.COMPLETED,
            MatchEvent.event_type == EventType.GOAL,
            MatchEvent.player_id.isnot(None),
            MatchEvent.deleted_at.is_(None),
            Match.deleted_at.is_(None),
        )
        .group_by(MatchEvent.player_id, Player.name, Player.team_id, Team.name)
        .order_by(func.count(MatchEvent.id).desc(), Player.name.asc())
        .limit(limit)
    )
    return [
        TopScorerResponse(
            player_id=r.player_id,
            player_name=r.player_name,
            team_id=r.team_id,
            team_name=r.team_name,
            goals=r.goals,
        )
        for r in result.all()
    ]


@router.get("/editions/{edition_id}/discipline", response_model=list[DisciplineResponse])
async def get_discipline(edition_id: UUID, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            MatchEvent.player_id,
            Player.name.label("player_name"),
            Player.team_id,
            Team.name.label("team_name"),
            func.sum(func.cast(MatchEvent.event_type == EventType.YELLOW_CARD, Integer)).label("yellow_cards"),
            func.sum(func.cast(MatchEvent.event_type == EventType.RED_CARD, Integer)).label("red_cards"),
        )
        .join(Match, MatchEvent.match_id == Match.id)
        .join(Player, MatchEvent.player_id == Player.id)
        .join(Team, Player.team_id == Team.id)
        .where(
            Match.edition_id == edition_id,
            MatchEvent.event_type.in_([EventType.YELLOW_CARD, EventType.RED_CARD]),
            MatchEvent.player_id.isnot(None),
            MatchEvent.deleted_at.is_(None),
            Match.deleted_at.is_(None),
        )
        .group_by(MatchEvent.player_id, Player.name, Player.team_id, Team.name)
    )
    rows = result.all()
    data = [
        DisciplineResponse(
            player_id=r.player_id,
            player_name=r.player_name,
            team_id=r.team_id,
            team_name=r.team_name,
            yellow_cards=r.yellow_cards or 0,
            red_cards=r.red_cards or 0,
            total=(r.yellow_cards or 0) + (r.red_cards or 0),
        )
        for r in rows
    ]
    data.sort(key=lambda x: (-x.total, -x.red_cards))
    return data[:limit]
