"""Seasons router"""
from uuid import UUID
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import User, UserRole, Organization, Competition, Season

router = APIRouter(prefix="/seasons", tags=["seasons"])


async def verify_competition_ownership(db: AsyncSession, competition_id: UUID, user: User):
    if user.role == UserRole.ADMIN:
        return
    result = await db.execute(
        select(Competition)
        .join(Organization, Organization.id == Competition.organization_id)
        .where(
            Competition.id == competition_id,
            Competition.deleted_at.is_(None),
            Organization.owner_user_id == user.id,
            Organization.deleted_at.is_(None),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this competition")


async def get_season_with_ownership(db: AsyncSession, season_id: UUID, user: User) -> Season:
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Season).where(Season.id == season_id, Season.deleted_at.is_(None))
        )
    else:
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
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


class SeasonCreate(BaseModel):
    competition_id: UUID
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = "active"


class SeasonUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


class SeasonResponse(BaseModel):
    id: UUID
    competition_id: UUID
    name: str
    start_date: Optional[date]
    end_date: Optional[date]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=SeasonResponse, status_code=status.HTTP_201_CREATED)
async def create_season(
    req: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_competition_ownership(db, req.competition_id, user)
    season = Season(
        competition_id=req.competition_id,
        name=req.name,
        start_date=req.start_date,
        end_date=req.end_date,
        status=req.status or "active",
    )
    try:
        db.add(season)
        await db.commit()
        await db.refresh(season)
        return season
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        raise HTTPException(status_code=409, detail="This action conflicts with existing season data.")

@router.get("", response_model=list[SeasonResponse])
async def list_seasons(
    competition_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_competition_ownership(db, competition_id, user)
    result = await db.execute(
        select(Season)
        .where(Season.competition_id == competition_id, Season.deleted_at.is_(None))
        .order_by(Season.name)
    )
    return result.scalars().all()


@router.get("/{id}", response_model=SeasonResponse)
async def get_season(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_season_with_ownership(db, id, user)


@router.patch("/{id}", response_model=SeasonResponse)
async def update_season(
    id: UUID,
    req: SeasonUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    season = await get_season_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(season, k, v)
    season.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(season)
    return season


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_season(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    season = await get_season_with_ownership(db, id, user)
    season.deleted_at = datetime.now(timezone.utc)
    season.updated_at = datetime.now(timezone.utc)
    await db.commit()
