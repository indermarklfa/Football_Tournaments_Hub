"""Teams router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import User, UserRole, Organization, Competition, Season, Division, Club, Team
from app.services.validation import populate_team_snapshots

router = APIRouter(prefix="/teams", tags=["teams"])


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


async def get_team_with_ownership(db: AsyncSession, team_id: UUID, user: User) -> Team:
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Team).where(Team.id == team_id, Team.deleted_at.is_(None))
        )
    else:
        result = await db.execute(
            select(Team)
            .join(Division, Division.id == Team.division_id)
            .join(Season, Season.id == Division.season_id)
            .join(Competition, Competition.id == Season.competition_id)
            .join(Organization, Organization.id == Competition.organization_id)
            .where(
                Team.id == team_id,
                Team.deleted_at.is_(None),
                Organization.owner_user_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


class TeamCreate(BaseModel):
    club_id: UUID
    division_id: UUID
    display_name: Optional[str] = None


class TeamUpdate(BaseModel):
    display_name: Optional[str] = None
    status: Optional[str] = None


class TeamResponse(BaseModel):
    id: UUID
    club_id: UUID
    division_id: UUID
    display_name: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    req: TeamCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_division_ownership(db, req.division_id, user)

    club_result = await db.execute(
        select(Club).where(Club.id == req.club_id, Club.deleted_at.is_(None))
    )
    club = club_result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    division_result = await db.execute(
        select(Division).where(Division.id == req.division_id, Division.deleted_at.is_(None))
    )
    division = division_result.scalar_one_or_none()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")

    if req.display_name:
        display_name = req.display_name
    else:
        age_group = (division.age_group or "").strip().lower()
        if age_group and age_group != "open":
            display_name = f"{club.name} {age_group.upper()}"
        else:
            display_name = club.name

    team = Team(
        club_id=req.club_id,
        division_id=req.division_id,
        display_name=display_name,
        status="active",
    )
    await populate_team_snapshots(db, team)
    try:
        db.add(team)
        await db.commit()
        await db.refresh(team)
        return team
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        if "uq_team_club_division" in msg:
            raise HTTPException(status_code=409, detail="This club already has a team in this division.")
        raise HTTPException(status_code=409, detail="This action conflicts with existing team data.")


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    division_id: UUID,
    club_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_division_ownership(db, division_id, user)
    filters = [Team.division_id == division_id, Team.deleted_at.is_(None)]
    if club_id is not None:
        filters.append(Team.club_id == club_id)
    result = await db.execute(select(Team).where(*filters).order_by(Team.display_name))
    return result.scalars().all()


@router.get("/{id}", response_model=TeamResponse)
async def get_team(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_team_with_ownership(db, id, user)


@router.patch("/{id}", response_model=TeamResponse)
async def update_team(
    id: UUID,
    req: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    team = await get_team_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(team, k, v)
    team.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(team)
    return team


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    team = await get_team_with_ownership(db, id, user)
    team.deleted_at = datetime.now(timezone.utc)
    team.updated_at = datetime.now(timezone.utc)
    await db.commit()
