"""Divisions router"""
from uuid import UUID
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import User, UserRole, Division, Season, Competition, Organization, FormatType

router = APIRouter(prefix="/divisions", tags=["divisions"])


async def verify_season_ownership(db: AsyncSession, season_id: UUID, user: User):
    if user.role == UserRole.ADMIN:
        return
    result = await db.execute(
        select(Season)
        .join(Competition, Competition.id == Season.competition_id)
        .join(Organization, Organization.id == Competition.organization_id)
        .where(
            Season.id == season_id,
            Season.deleted_at.is_(None),
            Organization.owner_user_id == user.id,
            Organization.deleted_at.is_(None),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this season")


async def get_division_with_ownership(db: AsyncSession, division_id: UUID, user: User) -> Division:
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Division).where(Division.id == division_id, Division.deleted_at.is_(None))
        )
    else:
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
    division = result.scalar_one_or_none()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    return division


class DivisionCreate(BaseModel):
    season_id: UUID
    name: str
    age_group: Optional[str] = None
    gender: Optional[str] = None
    format_type: Optional[str] = "league"
    min_birthdate: Optional[date] = None
    max_birthdate: Optional[date] = None
    status: Optional[str] = "active"


class DivisionUpdate(BaseModel):
    name: Optional[str] = None
    age_group: Optional[str] = None
    gender: Optional[str] = None
    format_type: Optional[str] = None
    min_birthdate: Optional[date] = None
    max_birthdate: Optional[date] = None
    status: Optional[str] = None


class DivisionResponse(BaseModel):
    id: UUID
    season_id: UUID
    name: str
    age_group: Optional[str]
    gender: Optional[str]
    format_type: str
    min_birthdate: Optional[date]
    max_birthdate: Optional[date]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=DivisionResponse, status_code=status.HTTP_201_CREATED)
async def create_division(
    req: DivisionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_season_ownership(db, req.season_id, user)
    division = Division(
        season_id=req.season_id,
        name=req.name,
        age_group=req.age_group,
        gender=req.gender,
        format_type=FormatType(req.format_type) if req.format_type else FormatType.LEAGUE,
        min_birthdate=req.min_birthdate,
        max_birthdate=req.max_birthdate,
        status=req.status or "active",
    )
    db.add(division)
    await db.commit()
    await db.refresh(division)
    return division


@router.get("", response_model=list[DivisionResponse])
async def list_divisions(
    season_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_season_ownership(db, season_id, user)
    result = await db.execute(
        select(Division)
        .where(Division.season_id == season_id, Division.deleted_at.is_(None))
        .order_by(Division.name)
    )
    return result.scalars().all()


@router.get("/{id}", response_model=DivisionResponse)
async def get_division(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_division_with_ownership(db, id, user)


@router.patch("/{id}", response_model=DivisionResponse)
async def update_division(
    id: UUID,
    req: DivisionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    division = await get_division_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    if "format_type" in data and data["format_type"]:
        data["format_type"] = FormatType(data["format_type"])
    for k, v in data.items():
        setattr(division, k, v)
    division.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(division)
    return division


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_division(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    division = await get_division_with_ownership(db, id, user)
    division.deleted_at = datetime.now(timezone.utc)
    division.updated_at = datetime.now(timezone.utc)
    await db.commit()
