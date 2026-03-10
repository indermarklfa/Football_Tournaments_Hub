"""Clubs router"""
import re
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import User, Club, Membership

router = APIRouter(prefix="/clubs", tags=["clubs"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


async def verify_org_membership(db: AsyncSession, organization_id: UUID, user: User):
    result = await db.execute(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user.id,
            Membership.is_active == True,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No membership in this organization")


async def get_club_with_access(db: AsyncSession, club_id: UUID, user: User) -> Club:
    result = await db.execute(
        select(Club)
        .join(Membership, Membership.organization_id == Club.organization_id)
        .where(
            Club.id == club_id,
            Club.deleted_at.is_(None),
            Membership.user_id == user.id,
            Membership.is_active == True,
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
    logo_url: Optional[str] = None
    home_venue: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    founded_year: Optional[int] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool = True
    is_public: bool = True


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    logo_url: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    founded_year: Optional[int] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    deleted: Optional[bool] = None


class ClubResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    slug: Optional[str]
    short_name: Optional[str]
    logo_url: Optional[str]
    home_venue: Optional[str]
    city: Optional[str]
    province: Optional[str]
    founded_year: Optional[int]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    is_active: bool
    is_public: bool
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
    await verify_org_membership(db, req.organization_id, user)

    club = Club(
        organization_id=req.organization_id,
        name=req.name,
        slug=slugify(req.name),
        short_name=req.short_name,
        logo_url=req.logo_url,
        home_venue=req.home_venue,
        city=req.city,
        province=req.province,
        founded_year=req.founded_year,
        contact_email=req.contact_email,
        contact_phone=req.contact_phone,
        is_active=req.is_active,
        is_public=req.is_public,
    )
    db.add(club)
    await db.commit()
    await db.refresh(club)
    return club


@router.get("", response_model=list[ClubResponse])
async def list_clubs(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_org_membership(db, organization_id, user)

    result = await db.execute(
        select(Club)
        .where(
            Club.organization_id == organization_id,
            Club.deleted_at.is_(None),
        )
        .order_by(Club.name.asc())
    )
    return result.scalars().all()


@router.get("/{id}", response_model=ClubResponse)
async def get_club(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_club_with_access(db, id, user)


@router.patch("/{id}", response_model=ClubResponse)
async def update_club(
    id: UUID,
    req: ClubUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    club = await get_club_with_access(db, id, user)
    data = req.model_dump(exclude_unset=True)

    if data.pop("deleted", None):
        club.deleted_at = datetime.now(timezone.utc)
    else:
        for k, v in data.items():
            setattr(club, k, v)
        if "name" in data and data["name"]:
            club.slug = slugify(data["name"])

    club.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(club)
    return club
