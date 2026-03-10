"""Matches router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organization, Competition, Season, Match, MatchStage, MatchStatus, Group, GroupTeam
from app.deps import get_current_user
from app.schemas.match import MatchCreate, MatchUpdate, MatchResponse
from pydantic import BaseModel
from typing import Optional
from itertools import combinations


router = APIRouter(prefix="/matches", tags=["matches"])


async def verify_edition_ownership(db: AsyncSession, season_id: UUID, user: User):
    if user.role.value == 'admin':
        return
    result = await db.execute(
        select(Season).join(Competition).join(Organization).where(Season.id == season_id, Organization.created_by_user_id == user.id, Season.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Season not owned by user")


async def get_match_with_ownership(db: AsyncSession, match_id: UUID, user: User) -> Match:
    result = await db.execute(
        select(Match).join(Season).join(Competition).join(Organization).where(Match.id == match_id, Organization.created_by_user_id == user.id, Match.deleted_at.is_(None))
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m


@router.post("", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
async def create_match(req: MatchCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, req.season_id, user)
    data = req.model_dump()
    data["stage"] = MatchStage(data["stage"])
    m = Match(**data)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@router.get("", response_model=list[MatchResponse])
async def list_matches(season_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, season_id, user)
    result = await db.execute(select(Match).where(Match.season_id == season_id, Match.deleted_at.is_(None)))
    return result.scalars().all()


@router.patch("/{id}", response_model=MatchResponse)
async def update_match(id: UUID, req: MatchUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    m = await get_match_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    if data.pop("deleted", None):
        m.deleted_at = datetime.now(timezone.utc)
    if "stage" in data:
        data["stage"] = MatchStage(data["stage"])
    if "status" in data:
        data["status"] = MatchStatus(data["status"])
    for k, v in data.items():
        setattr(m, k, v)
    await db.commit()
    await db.refresh(m)
    return m

@router.post("/{id}/delete", response_model=MatchResponse)
async def delete_match(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    m = await get_match_with_ownership(db, id, user)
    m.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(m)
    return m

class GenerateFixturesRequest(BaseModel):
    season_id: UUID
    venue: Optional[str] = None

@router.post("/generate-group-fixtures", status_code=201)
async def generate_group_fixtures(
    req: GenerateFixturesRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Generate round-robin group fixtures for all groups in a season"""
    await verify_edition_ownership(db, req.season_id, user)

    # Get all groups for this season
    groups_result = await db.execute(
        select(Group).where(
            Group.season_id == req.season_id,
            Group.deleted_at.is_(None)
        )
    )
    groups = groups_result.scalars().all()

    if not groups:
        raise HTTPException(status_code=400, detail="No groups found for this season")

    # Check no group fixtures already exist
    existing = await db.execute(
        select(Match).where(
            Match.season_id == req.season_id,
            Match.stage == MatchStage.GROUP,
            Match.deleted_at.is_(None)
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Group fixtures already exist for this season")

    total_created = 0

    for group in groups:
        # Get teams in this group
        teams_result = await db.execute(
            select(GroupTeam).where(
                GroupTeam.group_id == group.id,
                GroupTeam.deleted_at.is_(None)
            )
        )
        group_teams = teams_result.scalars().all()
        team_ids = [gt.team_id for gt in group_teams]

        if len(team_ids) < 2:
            continue

        # Generate round-robin using circle method for matchday assignment
        # Even number of teams: n-1 matchdays, each team plays once per matchday
        # Odd number of teams: n matchdays
        n = len(team_ids)
        teams = list(team_ids)

        # If odd number, add a dummy BYE team
        if n % 2 == 1:
            teams.append(None)

        rounds = len(teams) - 1
        half = len(teams) // 2

        for matchday in range(1, rounds + 1):
            for i in range(half):
                home_id = teams[i]
                away_id = teams[len(teams) - 1 - i]

                # Skip if either team is BYE
                if home_id is None or away_id is None:
                    continue

                # Alternate home/away each round for fairness
                if matchday % 2 == 0:
                    home_id, away_id = away_id, home_id

                match = Match(
                    season_id=req.season_id,
                    group_id=group.id,
                    stage=MatchStage.GROUP,
                    matchday=matchday,
                    home_team_id=home_id,
                    away_team_id=away_id,
                    status=MatchStatus.SCHEDULED,
                    venue=req.venue,
                )
                db.add(match)
                total_created += 1

            # Rotate teams (keep first team fixed, rotate the rest)
            teams = [teams[0]] + [teams[-1]] + teams[1:-1]

    await db.commit()
    return {"created": total_created, "groups": len(groups)}

class BulkMatchUpdate(BaseModel):
    id: UUID
    kickoff_datetime: Optional[str] = None
    venue: Optional[str] = None

    def parsed_kickoff(self):
        if not self.kickoff_datetime:
            return None
        try:
            return datetime.fromisoformat(self.kickoff_datetime)
        except ValueError:
            return None

class BulkUpdateRequest(BaseModel):
    matches: list[BulkMatchUpdate]

@router.post("/bulk-update")
async def bulk_update_matches(
    req: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Bulk update kickoff times and venues for multiple matches"""
    updated = 0
    for item in req.matches:
        result = await db.execute(
            select(Match).join(Season).join(Competition).join(Organization).where(
                Match.id == item.id,
                Organization.created_by_user_id == user.id,
                Match.deleted_at.is_(None)
            )
        )
        match = result.scalar_one_or_none()
        if not match:
            continue
        if item.kickoff_datetime:
            match.kickoff_datetime = item.parsed_kickoff()
        if item.venue is not None:
            match.venue = item.venue
        updated += 1
    await db.commit()
    return {"updated": updated}
