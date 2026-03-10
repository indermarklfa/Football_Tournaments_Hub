"""Teams router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organization, Competition, Season, Team, Division, Club, AgeGroup
from app.deps import get_current_user
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse

router = APIRouter(prefix="/teams", tags=["teams"])


async def verify_edition_ownership(db: AsyncSession, season_id: UUID, user: User):
    if user.role.value == 'admin':
        return
    result = await db.execute(
        select(Season).join(Competition).join(Organization).where(
            Season.id == season_id,
            Organization.created_by_user_id == user.id,
            Season.deleted_at.is_(None),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Season not owned by user")


async def verify_division_ownership(db: AsyncSession, division_id: UUID, user: User):
    if user.role.value == 'admin':
        return
    result = await db.execute(
        select(Division).join(Season).join(Competition).join(Organization).where(
            Division.id == division_id,
            Division.deleted_at.is_(None),
            Organization.created_by_user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Division not owned by user")


async def get_team_with_ownership(db: AsyncSession, team_id: UUID, user: User) -> Team:
    result = await db.execute(
        select(Team).join(Season).join(Competition).join(Organization).where(
            Team.id == team_id,
            Organization.created_by_user_id == user.id,
            Team.deleted_at.is_(None),
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(req: TeamCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, req.season_id, user)
    await verify_division_ownership(db, req.division_id, user)

    club_result = await db.execute(
        select(Club).where(Club.id == req.club_id, Club.deleted_at.is_(None))
    )
    club = club_result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    div_result = await db.execute(
        select(Division).where(Division.id == req.division_id, Division.deleted_at.is_(None))
    )
    division = div_result.scalar_one_or_none()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")

    age_val = division.age_group.value if hasattr(division.age_group, 'value') else str(division.age_group)
    if not age_val or age_val.lower() == 'open':
        name = club.name
    else:
        name = f"{club.name} {age_val.upper()}"

    t = Team(
        season_id=req.season_id,
        club_id=req.club_id,
        division_id=req.division_id,
        name=name,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    season_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    division_id: Optional[UUID] = None,
    club_id: Optional[UUID] = None,
):
    await verify_edition_ownership(db, season_id, user)
    filters = [Team.season_id == season_id, Team.deleted_at.is_(None)]
    if division_id is not None:
        filters.append(Team.division_id == division_id)
    if club_id is not None:
        filters.append(Team.club_id == club_id)
    result = await db.execute(select(Team).where(*filters))
    return result.scalars().all()


@router.patch("/{id}", response_model=TeamResponse)
async def update_team(id: UUID, req: TeamUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = await get_team_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    if data.pop("deleted", None):
        t.deleted_at = datetime.now(timezone.utc)
    else:
        for k, v in data.items():
            setattr(t, k, v)
    await db.commit()
    await db.refresh(t)
    return t
