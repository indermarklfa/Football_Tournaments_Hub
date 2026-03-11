"""Public endpoints (no auth)"""
from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer
from app.db import get_db
from app.models import (
    Competition, Season, Division, Team, Club, Match, Organization, MatchEvent, MatchStatus,
    EventType, Player, Group, GroupTeam, PlayerRegistration,
)

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/competitions/search")
async def search_competitions(q: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = (
        select(Competition, Organization.name.label("org_name"))
        .join(Organization)
        .where(Competition.deleted_at.is_(None), Organization.deleted_at.is_(None))
    )
    if q:
        like = f"%{q}%"
        query = query.where(
            Competition.name.ilike(like) | Organization.name.ilike(like)
        )
    result = await db.execute(query.limit(50))
    rows = result.all()
    return [
        {
            "id": str(r.Competition.id),
            "name": r.Competition.name,
            "competition_type": r.Competition.competition_type,
            "scope_level": r.Competition.scope_level,
            "org_name": r.org_name,
        }
        for r in rows
    ]


@router.get("/competitions/{competition_id}")
async def get_public_competition(competition_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Competition, Organization.name.label("org_name"))
        .join(Organization)
        .where(Competition.id == competition_id, Competition.deleted_at.is_(None))
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Competition not found")
    seasons_result = await db.execute(
        select(Season)
        .where(Season.competition_id == competition_id, Season.deleted_at.is_(None))
        .order_by(Season.name.desc())
    )
    seasons = seasons_result.scalars().all()
    return {
        "id": str(row.Competition.id),
        "name": row.Competition.name,
        "competition_type": row.Competition.competition_type,
        "scope_level": row.Competition.scope_level,
        "org_name": row.org_name,
        "seasons": [
            {"id": str(s.id), "name": s.name, "status": s.status}
            for s in seasons
        ],
    }


@router.get("/seasons/{season_id}")
async def get_public_season(season_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Season, Competition.name.label("comp_name"))
        .join(Competition)
        .where(Season.id == season_id, Season.deleted_at.is_(None))
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Season not found")
    s = row.Season
    divisions_result = await db.execute(
        select(Division).where(Division.season_id == season_id, Division.deleted_at.is_(None))
    )
    divisions = divisions_result.scalars().all()
    return {
        "id": str(s.id),
        "competition_id": str(s.competition_id),
        "competition_name": row.comp_name,
        "name": s.name,
        "start_date": s.start_date.isoformat() if s.start_date else None,
        "end_date": s.end_date.isoformat() if s.end_date else None,
        "status": s.status,
        "divisions": [
            {"id": str(d.id), "name": d.name, "age_group": d.age_group, "gender": d.gender, "format_type": d.format_type.value if hasattr(d.format_type, 'value') else d.format_type}
            for d in divisions
        ],
    }


@router.get("/divisions/{division_id}/teams")
async def get_public_teams(division_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Team, Club.name.label("club_name"))
        .join(Club, Club.id == Team.club_id)
        .where(Team.division_id == division_id, Team.deleted_at.is_(None))
        .order_by(Team.display_name)
    )
    rows = result.all()
    return [
        {
            "id": str(r.Team.id),
            "display_name": r.Team.display_name,
            "club_id": str(r.Team.club_id),
            "club_name": r.club_name,
            "status": r.Team.status,
        }
        for r in rows
    ]


@router.get("/divisions/{division_id}/fixtures")
async def get_public_fixtures(division_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Match)
        .where(Match.division_id == division_id, Match.deleted_at.is_(None))
        .order_by(Match.matchday.asc().nullslast(), Match.kickoff_at.asc().nullslast())
    )
    matches = result.scalars().all()
    team_ids = {m.home_team_id for m in matches} | {m.away_team_id for m in matches}
    teams = {}
    if team_ids:
        teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
        teams = {t.id: t for t in teams_result.scalars().all()}
    return [
        {
            "id": str(m.id),
            "matchday": m.matchday,
            "round_no": m.round_no,
            "kickoff_at": m.kickoff_at.isoformat() if m.kickoff_at else None,
            "home_team_id": str(m.home_team_id),
            "home_team_name": teams[m.home_team_id].display_name if m.home_team_id in teams else None,
            "away_team_id": str(m.away_team_id),
            "away_team_name": teams[m.away_team_id].display_name if m.away_team_id in teams else None,
            "home_score": m.home_score,
            "away_score": m.away_score,
            "status": m.status.value if hasattr(m.status, 'value') else m.status,
            "group_id": str(m.group_id) if m.group_id else None,
        }
        for m in matches
    ]


@router.get("/matches/{match_id}/events")
async def get_match_events(match_id: UUID, db: AsyncSession = Depends(get_db)):
    match_result = await db.execute(select(Match).where(Match.id == match_id, Match.deleted_at.is_(None)))
    if not match_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Match not found")
    result = await db.execute(
        select(MatchEvent)
        .where(MatchEvent.match_id == match_id)
        .order_by(MatchEvent.minute.asc(), MatchEvent.extra_minute.asc().nullslast())
    )
    events = result.scalars().all()
    player_ids = {e.player_id for e in events if e.player_id}
    players = {}
    if player_ids:
        p_result = await db.execute(select(Player).where(Player.id.in_(player_ids)))
        players = {p.id: f"{p.first_name} {p.last_name}" for p in p_result.scalars().all()}
    return [
        {
            "id": str(e.id),
            "team_id": str(e.team_id),
            "player_id": str(e.player_id) if e.player_id else None,
            "player_name": players.get(e.player_id) if e.player_id else None,
            "related_player_id": str(e.related_player_id) if e.related_player_id else None,
            "event_type": e.event_type.value if hasattr(e.event_type, 'value') else e.event_type,
            "minute": e.minute,
            "extra_minute": e.extra_minute,
        }
        for e in events
    ]


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
        "division_id": str(m.division_id),
        "matchday": m.matchday,
        "round_no": m.round_no,
        "kickoff_at": m.kickoff_at.isoformat() if m.kickoff_at else None,
        "home_team_id": str(m.home_team_id),
        "home_team_name": teams[m.home_team_id].display_name if m.home_team_id in teams else None,
        "away_team_id": str(m.away_team_id),
        "away_team_name": teams[m.away_team_id].display_name if m.away_team_id in teams else None,
        "home_score": m.home_score,
        "away_score": m.away_score,
        "status": m.status.value if hasattr(m.status, 'value') else m.status,
        "group_id": str(m.group_id) if m.group_id else None,
    }


@router.get("/divisions/{division_id}/standings")
async def get_standings(division_id: UUID, db: AsyncSession = Depends(get_db)):
    groups_result = await db.execute(
        select(Group).where(Group.division_id == division_id).order_by(Group.sort_order, Group.name)
    )
    groups = groups_result.scalars().all()
    if not groups:
        # League standings (no groups)
        return await _compute_league_standings(division_id, db)

    group_ids = [g.id for g in groups]
    gt_result = await db.execute(
        select(GroupTeam).where(GroupTeam.group_id.in_(group_ids))
    )
    memberships = gt_result.scalars().all()
    team_ids = list({m.team_id for m in memberships})

    teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
    teams = {t.id: t.display_name for t in teams_result.scalars().all()}

    matches_result = await db.execute(
        select(Match).where(
            Match.division_id == division_id,
            Match.group_id.isnot(None),
            Match.status == MatchStatus.COMPLETED,
            Match.deleted_at.is_(None),
        )
    )
    matches = matches_result.scalars().all()

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
        home["gf"] += m.home_score or 0; home["ga"] += m.away_score or 0
        away["gf"] += m.away_score or 0; away["ga"] += m.home_score or 0
        if (m.home_score or 0) > (m.away_score or 0):
            home["w"] += 1; home["pts"] += 3; away["l"] += 1
        elif (m.away_score or 0) > (m.home_score or 0):
            away["w"] += 1; away["pts"] += 3; home["l"] += 1
        else:
            home["d"] += 1; home["pts"] += 1; away["d"] += 1; away["pts"] += 1

    for g in group_map.values():
        for row in g["standings"].values():
            row["gd"] = row["gf"] - row["ga"]
        g["standings"] = sorted(
            g["standings"].values(),
            key=lambda x: (-x["pts"], -x["gd"], -x["gf"], x["team_name"]),
        )

    return list(group_map.values())


async def _compute_league_standings(division_id: UUID, db: AsyncSession):
    teams_result = await db.execute(
        select(Team).where(Team.division_id == division_id, Team.deleted_at.is_(None))
    )
    teams = {t.id: t.display_name for t in teams_result.scalars().all()}

    matches_result = await db.execute(
        select(Match).where(
            Match.division_id == division_id,
            Match.status == MatchStatus.COMPLETED,
            Match.deleted_at.is_(None),
        )
    )
    matches = matches_result.scalars().all()

    standings = {tid: {"team_id": str(tid), "team_name": name, "p": 0, "w": 0, "d": 0, "l": 0,
                       "gf": 0, "ga": 0, "gd": 0, "pts": 0}
                 for tid, name in teams.items()}

    for m in matches:
        home = standings.get(m.home_team_id)
        away = standings.get(m.away_team_id)
        if not home or not away:
            continue
        home["p"] += 1; away["p"] += 1
        home["gf"] += m.home_score or 0; home["ga"] += m.away_score or 0
        away["gf"] += m.away_score or 0; away["ga"] += m.home_score or 0
        if (m.home_score or 0) > (m.away_score or 0):
            home["w"] += 1; home["pts"] += 3; away["l"] += 1
        elif (m.away_score or 0) > (m.home_score or 0):
            away["w"] += 1; away["pts"] += 3; home["l"] += 1
        else:
            home["d"] += 1; home["pts"] += 1; away["d"] += 1; away["pts"] += 1

    for row in standings.values():
        row["gd"] = row["gf"] - row["ga"]

    return sorted(standings.values(), key=lambda x: (-x["pts"], -x["gd"], -x["gf"], x["team_name"]))


@router.get("/divisions/{division_id}/topscorers")
async def get_top_scorers(division_id: UUID, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            MatchEvent.player_id,
            Player.first_name.label("first_name"),
            Player.last_name.label("last_name"),
            MatchEvent.team_id,
            Team.display_name.label("team_name"),
            func.count(MatchEvent.id).label("goals"),
        )
        .join(Match, MatchEvent.match_id == Match.id)
        .join(Player, MatchEvent.player_id == Player.id)
        .join(Team, MatchEvent.team_id == Team.id)
        .where(
            Match.division_id == division_id,
            Match.status == MatchStatus.COMPLETED,
            MatchEvent.event_type.in_([EventType.GOAL, EventType.PENALTY_SCORED]),
            MatchEvent.player_id.isnot(None),
            Match.deleted_at.is_(None),
        )
        .group_by(MatchEvent.player_id, Player.first_name, Player.last_name, MatchEvent.team_id, Team.display_name)
        .order_by(func.count(MatchEvent.id).desc(), Player.last_name.asc())
        .limit(limit)
    )
    return [
        {
            "player_id": str(r.player_id),
            "player_name": f"{r.first_name} {r.last_name}",
            "team_id": str(r.team_id),
            "team_name": r.team_name,
            "goals": r.goals,
        }
        for r in result.all()
    ]


@router.get("/divisions/{division_id}/discipline")
async def get_discipline(division_id: UUID, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            MatchEvent.player_id,
            Player.first_name.label("first_name"),
            Player.last_name.label("last_name"),
            MatchEvent.team_id,
            Team.display_name.label("team_name"),
            func.sum(func.cast(MatchEvent.event_type == EventType.YELLOW_CARD, Integer)).label("yellow_cards"),
            func.sum(func.cast(MatchEvent.event_type == EventType.RED_CARD, Integer)).label("red_cards"),
        )
        .join(Match, MatchEvent.match_id == Match.id)
        .join(Player, MatchEvent.player_id == Player.id)
        .join(Team, MatchEvent.team_id == Team.id)
        .where(
            Match.division_id == division_id,
            MatchEvent.event_type.in_([EventType.YELLOW_CARD, EventType.RED_CARD, EventType.YELLOW_RED_CARD]),
            MatchEvent.player_id.isnot(None),
            Match.deleted_at.is_(None),
        )
        .group_by(MatchEvent.player_id, Player.first_name, Player.last_name, MatchEvent.team_id, Team.display_name)
    )
    rows = result.all()
    data = [
        {
            "player_id": str(r.player_id),
            "player_name": f"{r.first_name} {r.last_name}",
            "team_id": str(r.team_id),
            "team_name": r.team_name,
            "yellow_cards": r.yellow_cards or 0,
            "red_cards": r.red_cards or 0,
            "total": (r.yellow_cards or 0) + (r.red_cards or 0),
        }
        for r in rows
    ]
    data.sort(key=lambda x: (-x["total"], -x["red_cards"]))
    return data[:limit]


@router.get("/teams/{team_id}/players")
async def get_public_players(team_id: UUID, db: AsyncSession = Depends(get_db)):
    team_result = await db.execute(select(Team).where(Team.id == team_id, Team.deleted_at.is_(None)))
    if not team_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Team not found")
    result = await db.execute(
        select(PlayerRegistration, Player)
        .join(Player, Player.id == PlayerRegistration.player_id)
        .where(PlayerRegistration.team_id == team_id, PlayerRegistration.status == "active")
        .order_by(PlayerRegistration.squad_number)
    )
    rows = result.all()
    return [
        {
            "id": str(row.Player.id),
            "first_name": row.Player.first_name,
            "last_name": row.Player.last_name,
            "squad_number": row.PlayerRegistration.squad_number,
            "primary_position": row.Player.primary_position.value if row.Player.primary_position and hasattr(row.Player.primary_position, 'value') else row.Player.primary_position,
        }
        for row in rows
    ]
