"""Matches router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from itertools import combinations
from app.db import get_db
from app.deps import get_current_user
from app.models import (
    User, UserRole, Organization, Competition, Season, Division, Match, MatchStatus,
    Group, GroupTeam,
)

router = APIRouter(prefix="/matches", tags=["matches"])


async def verify_division_ownership(db: AsyncSession, division_id: UUID, user: User):
    if user.role == UserRole.ADMIN:
        return
    result = await db.execute(
        select(Division)
        .join(Season, Season.id == Division.season_id)
        .join(Competition, Competition.id == Season.competition_id)
        .join(Organization, Organization.id == Competition.organization_id)
        .where(
            Division.id == division_id,
            Division.deleted_at.is_(None),
            Organization.owner_user_id == user.id,
            Organization.deleted_at.is_(None),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this division")


async def get_match_with_ownership(db: AsyncSession, match_id: UUID, user: User) -> Match:
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Match).where(Match.id == match_id, Match.deleted_at.is_(None))
        )
    else:
        result = await db.execute(
            select(Match)
            .join(Division, Division.id == Match.division_id)
            .join(Season, Season.id == Division.season_id)
            .join(Competition, Competition.id == Season.competition_id)
            .join(Organization, Organization.id == Competition.organization_id)
            .where(
                Match.id == match_id,
                Match.deleted_at.is_(None),
                Organization.owner_user_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m


class MatchCreate(BaseModel):
    division_id: UUID
    group_id: Optional[UUID] = None
    home_team_id: UUID
    away_team_id: UUID
    venue_id: Optional[UUID] = None
    round_no: Optional[int] = None
    matchday: Optional[int] = None
    kickoff_at: Optional[datetime] = None
    status: Optional[str] = "scheduled"
    notes: Optional[str] = None


class MatchUpdate(BaseModel):
    group_id: Optional[UUID] = None
    home_team_id: Optional[UUID] = None
    away_team_id: Optional[UUID] = None
    venue_id: Optional[UUID] = None
    round_no: Optional[int] = None
    matchday: Optional[int] = None
    kickoff_at: Optional[datetime] = None
    status: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    notes: Optional[str] = None


class MatchResponse(BaseModel):
    id: UUID
    division_id: UUID
    group_id: Optional[UUID]
    home_team_id: UUID
    away_team_id: UUID
    venue_id: Optional[UUID]
    round_no: Optional[int]
    matchday: Optional[int]
    kickoff_at: Optional[datetime]
    status: str
    home_score: Optional[int]
    away_score: Optional[int]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
async def create_match(
    req: MatchCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_division_ownership(db, req.division_id, user)
    data = req.model_dump()
    if data.get("status"):
        data["status"] = MatchStatus(data["status"])
    m = Match(**data)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@router.get("", response_model=list[MatchResponse])
async def list_matches(
    division_id: UUID,
    group_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_division_ownership(db, division_id, user)
    filters = [Match.division_id == division_id, Match.deleted_at.is_(None)]
    if group_id is not None:
        filters.append(Match.group_id == group_id)
    result = await db.execute(
        select(Match).where(*filters).order_by(Match.matchday, Match.kickoff_at)
    )
    return result.scalars().all()


@router.get("/{id}", response_model=MatchResponse)
async def get_match(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_match_with_ownership(db, id, user)


@router.patch("/{id}", response_model=MatchResponse)
async def update_match(
    id: UUID,
    req: MatchUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    m = await get_match_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        data["status"] = MatchStatus(data["status"])
    for k, v in data.items():
        setattr(m, k, v)
    m.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(m)
    return m


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_match(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    m = await get_match_with_ownership(db, id, user)
    m.deleted_at = datetime.now(timezone.utc)
    m.updated_at = datetime.now(timezone.utc)
    await db.commit()


class GenerateFixturesRequest(BaseModel):
    division_id: UUID
    venue_id: Optional[UUID] = None


@router.post("/generate-group-fixtures", status_code=201)
async def generate_group_fixtures(
    req: GenerateFixturesRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate round-robin group fixtures for all groups in a division"""
    await verify_division_ownership(db, req.division_id, user)

    groups_result = await db.execute(
        select(Group).where(Group.division_id == req.division_id)
    )
    groups = groups_result.scalars().all()

    if not groups:
        raise HTTPException(status_code=400, detail="No groups found for this division")

    existing = await db.execute(
        select(Match).where(
            Match.division_id == req.division_id,
            Match.group_id.isnot(None),
            Match.deleted_at.is_(None),
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Group fixtures already exist for this division")

    total_created = 0

    for group in groups:
        teams_result = await db.execute(
            select(GroupTeam).where(GroupTeam.group_id == group.id)
        )
        group_teams = teams_result.scalars().all()
        team_ids = [gt.team_id for gt in group_teams]

        if len(team_ids) < 2:
            continue

        n = len(team_ids)
        teams = list(team_ids)

        if n % 2 == 1:
            teams.append(None)

        rounds = len(teams) - 1
        half = len(teams) // 2

        for matchday in range(1, rounds + 1):
            for i in range(half):
                home_id = teams[i]
                away_id = teams[len(teams) - 1 - i]

                if home_id is None or away_id is None:
                    continue

                if matchday % 2 == 0:
                    home_id, away_id = away_id, home_id

                match = Match(
                    division_id=req.division_id,
                    group_id=group.id,
                    matchday=matchday,
                    home_team_id=home_id,
                    away_team_id=away_id,
                    status=MatchStatus.SCHEDULED,
                    venue_id=req.venue_id,
                )
                db.add(match)
                total_created += 1

            teams = [teams[0]] + [teams[-1]] + teams[1:-1]

    await db.commit()
    return {"created": total_created, "groups": len(groups)}


class BulkMatchUpdate(BaseModel):
    id: UUID
    kickoff_at: Optional[str] = None
    venue_id: Optional[UUID] = None

    def parsed_kickoff(self):
        if not self.kickoff_at:
            return None
        try:
            return datetime.fromisoformat(self.kickoff_at)
        except ValueError:
            return None


class BulkUpdateRequest(BaseModel):
    matches: list[BulkMatchUpdate]


@router.post("/bulk-update")
async def bulk_update_matches(
    req: BulkUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    updated = 0
    for item in req.matches:
        try:
            m = await get_match_with_ownership(db, item.id, user)
        except HTTPException:
            continue
        if item.kickoff_at:
            m.kickoff_at = item.parsed_kickoff()
        if item.venue_id is not None:
            m.venue_id = item.venue_id
        updated += 1
    await db.commit()
    return {"updated": updated}
