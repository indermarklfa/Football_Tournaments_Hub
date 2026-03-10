"""Competitions router"""
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
from app.models import User, Organization, Competition, Membership

router = APIRouter(prefix="/competitions", tags=["competitions"])


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


async def get_competition_with_access(db: AsyncSession, competition_id: UUID, user: User) -> Competition:
    result = await db.execute(
        select(Competition)
        .join(Organization, Organization.id == Competition.organization_id)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(
            Competition.id == competition_id,
            Competition.deleted_at.is_(None),
            Membership.user_id == user.id,
            Membership.is_active == True,
        )
    )
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
    return comp


class CompetitionCreate(BaseModel):
    organization_id: UUID
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    sport_type: str = "football"
    visibility: str = "public"


class CompetitionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    visibility: Optional[str] = None
    deleted: Optional[bool] = None


class CompetitionResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    slug: Optional[str]
    description: Optional[str]
    logo_url: Optional[str]
    banner_url: Optional[str]
    sport_type: str
    visibility: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
async def create_competition(
    req: CompetitionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_org_membership(db, req.organization_id, user)

    comp = Competition(
        organization_id=req.organization_id,
        name=req.name,
        slug=slugify(req.name),
        description=req.description,
        logo_url=req.logo_url,
        banner_url=req.banner_url,
        sport_type=req.sport_type,
        visibility=req.visibility,
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.get("", response_model=list[CompetitionResponse])
async def list_competitions(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_org_membership(db, organization_id, user)

    result = await db.execute(
        select(Competition)
        .where(
            Competition.organization_id == organization_id,
            Competition.deleted_at.is_(None),
        )
        .order_by(Competition.name.asc())
    )
    return result.scalars().all()


@router.get("/{id}", response_model=CompetitionResponse)
async def get_competition(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_competition_with_access(db, id, user)


@router.patch("/{id}", response_model=CompetitionResponse)
async def update_competition(
    id: UUID,
    req: CompetitionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    comp = await get_competition_with_access(db, id, user)
    data = req.model_dump(exclude_unset=True)

    if data.pop("deleted", None):
        comp.deleted_at = datetime.now(timezone.utc)
    else:
        for k, v in data.items():
            setattr(comp, k, v)
        if "name" in data and data["name"]:
            comp.slug = slugify(data["name"])

    comp.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(comp)
    return comp
