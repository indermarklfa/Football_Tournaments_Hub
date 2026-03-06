"""Public endpoints (no auth)"""
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer
from sqlalchemy.orm import selectinload
from app.db import get_db
from app.models import Tournament, Edition, Team, Match, Organiser, MatchEvent, MatchStatus, MatchStage, EventType, Player, Group, GroupTeam
from app.schemas.public import (
    PublicTournamentResponse, PublicEditionResponse, PublicTeamResponse, PublicFixtureResponse,
    PublicMatchEventResponse, TopScorerResponse, DisciplineResponse
)

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/tournaments/search", response_model=list[PublicTournamentResponse])
async def search_tournaments(q: Optional[str] = None, location: Optional[str] = None, age_group: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(Tournament, Organiser.name.label("org_name"), Organiser.location.label("org_loc")).join(Organiser).where(Tournament.deleted_at.is_(None), Organiser.deleted_at.is_(None))
    if q:
        query = query.where(
            Tournament.name.ilike(f"%{q}%") |
            Organiser.name.ilike(f"%{q}%") |
            Organiser.location.ilike(f"%{q}%")
        )
    if location:
        query = query.where(Organiser.location.ilike(f"%{location}%"))
    if age_group:
        query = query.where(Tournament.age_group == age_group)
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
            age_group=r.Tournament.age_group,
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
            home_penalties=m.home_penalties,
            away_penalties=m.away_penalties,
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
            MatchEvent.event_type.in_([EventType.GOAL, EventType.PENALTY_SCORED]),
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


@router.get("/teams/{team_id}/players")
async def get_public_players(team_id: UUID, db: AsyncSession = Depends(get_db)):
    team_result = await db.execute(select(Team).where(Team.id == team_id, Team.deleted_at.is_(None)))
    if not team_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Team not found")
    result = await db.execute(select(Player).where(Player.team_id == team_id, Player.deleted_at.is_(None)))
    players = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "jersey_number": p.jersey_number,
            "position": p.position.value if p.position else None,
        }
        for p in players
    ]


@router.get("/tournaments/{tournament_id}")
async def get_public_tournament(tournament_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Tournament, Organiser.name.label("org_name"), Organiser.location.label("org_loc"))
        .join(Organiser)
        .where(Tournament.id == tournament_id, Tournament.deleted_at.is_(None))
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Tournament not found")
    t = row.Tournament
    editions_result = await db.execute(
        select(Edition).where(Edition.tournament_id == tournament_id, Edition.deleted_at.is_(None)).order_by(Edition.year.desc())
    )
    editions = editions_result.scalars().all()
    return {
        "id": str(t.id),
        "name": t.name,
        "description": t.description,
        "logo_url": t.logo_url,
        "organiser_name": row.org_name,
        "organiser_location": row.org_loc,
        "editions": [
            {"id": str(e.id), "name": e.name, "year": e.year, "status": e.status.value}
            for e in editions
        ],
    }


@router.get("/matches/{match_id}")
async def get_public_match(match_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Match).where(Match.id == match_id, Match.deleted_at.is_(None)))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    teams_result = await db.execute(select(Team).where(Team.id.in_([m.home_team_id, m.away_team_id])))
    teams = {t.id: t for t in teams_result.scalars().all()}
    return {
        "id": str(m.id),
        "edition_id": str(m.edition_id),
        "stage": m.stage.value,
        "matchday": m.matchday,
        "kickoff_datetime": m.kickoff_datetime.isoformat() if m.kickoff_datetime else None,
        "venue": m.venue,
        "home_team_id": str(m.home_team_id),
        "home_team_name": teams.get(m.home_team_id).name if teams.get(m.home_team_id) else None,
        "away_team_id": str(m.away_team_id),
        "away_team_name": teams.get(m.away_team_id).name if teams.get(m.away_team_id) else None,
        "home_score": m.home_score,
        "away_score": m.away_score,
        "home_penalties": m.home_penalties,
        "away_penalties": m.away_penalties,
        "status": m.status.value,
    }
@router.get("/editions/{edition_id}/standings")
async def get_standings(edition_id: UUID, db: AsyncSession = Depends(get_db)):
    # Load all groups for this edition
    groups_result = await db.execute(
        select(Group).where(Group.edition_id == edition_id, Group.deleted_at.is_(None)).order_by(Group.name)
    )
    groups = groups_result.scalars().all()
    if not groups:
        return []

    # Load all group team memberships
    group_ids = [g.id for g in groups]
    gt_result = await db.execute(
        select(GroupTeam).where(GroupTeam.group_id.in_(group_ids), GroupTeam.deleted_at.is_(None))
    )
    memberships = gt_result.scalars().all()
    team_ids = [m.team_id for m in memberships]

    # Load teams
    teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
    teams = {t.id: t.name for t in teams_result.scalars().all()}

    # Load completed group matches
    matches_result = await db.execute(
        select(Match).where(
            Match.edition_id == edition_id,
            Match.stage == MatchStage.GROUP,
            Match.status == MatchStatus.COMPLETED,
            Match.deleted_at.is_(None),
        )
    )
    matches = matches_result.scalars().all()

    # Calculate standings per group
    def make_row(team_id):
        return {"team_id": str(team_id), "team_name": teams.get(team_id, "Unknown"),
                "p": 0, "w": 0, "d": 0, "l": 0, "gf": 0, "ga": 0, "gd": 0, "pts": 0}

    group_map = {g.id: {"id": str(g.id), "name": g.name, "standings": {}} for g in groups}

    for m in memberships:
        if m.group_id in group_map:
            group_map[m.group_id]["standings"][m.team_id] = make_row(m.team_id)

    for m in matches:
        if m.group_id not in group_map:
            continue
        standings = group_map[m.group_id]["standings"]
        home = standings.get(m.home_team_id)
        away = standings.get(m.away_team_id)
        if not home or not away:
            continue
        home["p"] += 1; away["p"] += 1
        home["gf"] += m.home_score; home["ga"] += m.away_score
        away["gf"] += m.away_score; away["ga"] += m.home_score
        if m.home_score > m.away_score:
            home["w"] += 1; home["pts"] += 3; away["l"] += 1
        elif m.away_score > m.home_score:
            away["w"] += 1; away["pts"] += 3; home["l"] += 1
        else:
            home["d"] += 1; home["pts"] += 1; away["d"] += 1; away["pts"] += 1

    for g in group_map.values():
        for row in g["standings"].values():
            row["gd"] = row["gf"] - row["ga"]
        g["standings"] = sorted(g["standings"].values(), key=lambda x: (-x["pts"], -x["gd"], -x["gf"], x["team_name"]))

    return list(group_map.values())