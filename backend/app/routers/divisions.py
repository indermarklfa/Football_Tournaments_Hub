"""Divisions router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.deps import get_current_user
from app.models import (
    User, Division, Season, Competition, Organization,
    AgeGroup, EditionFormat,
)
from app.schemas.division import DivisionCreate, DivisionUpdate, DivisionResponse

router = APIRouter(prefix="/divisions", tags=["divisions"])


async def verify_season_ownership(db: AsyncSession, season_id: UUID, user: User):
    if user.role == "admin":
        return
    result = await db.execute(
        select(Season)
        .join(Competition, Competition.id == Season.competition_id)
        .join(Organization, Organization.id == Competition.organization_id)
        .where(
            Season.id == season_id,
            Season.deleted_at.is_(None),
            Organization.created_by_user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this season")


async def get_division_with_ownership(db: AsyncSession, division_id: UUID, user: User) -> Division:
    if user.role == "admin":
        result = await db.execute(
            select(Division).where(
                Division.id == division_id,
                Division.deleted_at.is_(None),
            )
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
                Season.deleted_at.is_(None),
                Organization.created_by_user_id == user.id,
            )
        )
    division = result.scalar_one_or_none()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    return division


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
        format=EditionFormat(req.format) if req.format else EditionFormat.LEAGUE,
        age_group=AgeGroup(req.age_group) if req.age_group else AgeGroup.OPEN,
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
        .where(
            Division.season_id == season_id,
            Division.deleted_at.is_(None),
        )
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

    if data.pop("deleted", None):
        division.deleted_at = datetime.now(timezone.utc)
    else:
        if "format" in data and data["format"]:
            data["format"] = EditionFormat(data["format"])
        if "age_group" in data and data["age_group"]:
            data["age_group"] = AgeGroup(data["age_group"])
        for k, v in data.items():
            setattr(division, k, v)

    division.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(division)
    return division
