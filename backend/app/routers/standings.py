"""Standings router"""
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.deps import get_current_user
from app.models import User, Match, Team, MatchStatus

router = APIRouter(prefix="/standings", tags=["standings"])


@router.get("")
async def get_standings(
    division_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    matches_result = await db.execute(
        select(Match).where(
            Match.division_id == division_id,
            Match.status == MatchStatus.COMPLETED,
            Match.deleted_at.is_(None),
        )
    )
    matches = matches_result.scalars().all()

    # Accumulate stats per team
    stats: dict[UUID, dict] = {}

    def get_or_create(team_id: UUID) -> dict:
        if team_id not in stats:
            stats[team_id] = {
                "played": 0, "won": 0, "drawn": 0, "lost": 0,
                "goals_for": 0, "goals_against": 0,
            }
        return stats[team_id]

    for m in matches:
        home = get_or_create(m.home_team_id)
        away = get_or_create(m.away_team_id)

        home_score = m.home_score or 0
        away_score = m.away_score or 0

        home["played"] += 1
        away["played"] += 1
        home["goals_for"] += home_score
        home["goals_against"] += away_score
        away["goals_for"] += away_score
        away["goals_against"] += home_score

        if home_score > away_score:
            home["won"] += 1
            away["lost"] += 1
        elif away_score > home_score:
            away["won"] += 1
            home["lost"] += 1
        else:
            home["drawn"] += 1
            away["drawn"] += 1

    if not stats:
        return []

    # Fetch team names
    teams_result = await db.execute(
        select(Team).where(Team.id.in_(list(stats.keys())), Team.deleted_at.is_(None))
    )
    team_map = {t.id: t.name for t in teams_result.scalars().all()}

    rows = []
    for team_id, s in stats.items():
        gd = s["goals_for"] - s["goals_against"]
        points = s["won"] * 3 + s["drawn"]
        rows.append({
            "team_id": str(team_id),
            "team_name": team_map.get(team_id, "Unknown"),
            "played": s["played"],
            "won": s["won"],
            "drawn": s["drawn"],
            "lost": s["lost"],
            "goals_for": s["goals_for"],
            "goals_against": s["goals_against"],
            "goal_difference": gd,
            "points": points,
        })

    rows.sort(key=lambda r: (-r["points"], -r["goal_difference"], -r["goals_for"]))
    return rows
