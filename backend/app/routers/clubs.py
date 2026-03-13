"""Clubs router"""
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
from app.models import User, UserRole, Organization, Club

router = APIRouter(prefix="/clubs", tags=["clubs"])


async def verify_org_ownership(db: AsyncSession, org_id: UUID, user: User):
    if user.role == UserRole.ADMIN:
        return
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_id,
            Organization.owner_user_id == user.id,
            Organization.deleted_at.is_(None),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this organization")


async def get_club_with_ownership(db: AsyncSession, club_id: UUID, user: User) -> Club:
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Club).where(Club.id == club_id, Club.deleted_at.is_(None))
        )
    else:
        result = await db.execute(
            select(Club)
            .join(Organization, Organization.id == Club.organization_id)
            .where(
                Club.id == club_id,
                Club.deleted_at.is_(None),
                Organization.owner_user_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
    club = result.scalar_one_or_none()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


class ClubCreate(BaseModel):
    organization_id: UUID
    name: str
    short_name: Optional[str] = None
    home_venue_id: Optional[UUID] = None
    home_structure_id: Optional[UUID] = None
    logo_url: Optional[str] = None


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    home_venue_id: Optional[UUID] = None
    home_structure_id: Optional[UUID] = None
    logo_url: Optional[str] = None
    status: Optional[str] = None


class ClubResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    short_name: Optional[str]
    home_venue_id: Optional[UUID]
    home_structure_id: Optional[UUID]
    logo_url: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
async def create_club(
    req: ClubCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_org_ownership(db, req.organization_id, user)
    club = Club(
        organization_id=req.organization_id,
        name=req.name,
        short_name=req.short_name,
        home_venue_id=req.home_venue_id,
        home_structure_id=req.home_structure_id,
        logo_url=req.logo_url,
        status="active",
    )
    try:
        db.add(club)
        await db.commit()
        await db.refresh(club)
        return club
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        raise HTTPException(status_code=409, detail="This action conflicts with existing match event data.")


@router.get("", response_model=list[ClubResponse])
async def list_clubs(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_org_ownership(db, organization_id, user)
    result = await db.execute(
        select(Club)
        .where(Club.organization_id == organization_id, Club.deleted_at.is_(None))
        .order_by(Club.name)
    )
    return result.scalars().all()


@router.get("/{id}", response_model=ClubResponse)
async def get_club(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_club_with_ownership(db, id, user)


@router.patch("/{id}", response_model=ClubResponse)
async def update_club(
    id: UUID,
    req: ClubUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    club = await get_club_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(club, k, v)
    club.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(club)
    return club


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_club(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    club = await get_club_with_ownership(db, id, user)
    club.deleted_at = datetime.now(timezone.utc)
    club.updated_at = datetime.now(timezone.utc)
    await db.commit()
