"""Organizations router"""
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
from app.models import User, Organization, Membership, MembershipRole

router = APIRouter(prefix="/organizations", tags=["organizations"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


async def get_org_with_membership(db: AsyncSession, org_id: UUID, user: User) -> Organization:
    result = await db.execute(
        select(Organization)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(
            Organization.id == org_id,
            Organization.deleted_at.is_(None),
            Membership.user_id == user.id,
            Membership.is_active == True,
        )
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: str = "South Africa"
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    website_url: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    website_url: Optional[str] = None
    deleted: Optional[bool] = None


class OrganizationResponse(BaseModel):
    id: UUID
    created_by_user_id: UUID
    name: str
    slug: Optional[str]
    description: Optional[str]
    city: Optional[str]
    province: Optional[str]
    country: str
    logo_url: Optional[str]
    banner_url: Optional[str]
    website_url: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    req: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org = Organization(
        created_by_user_id=user.id,
        name=req.name,
        slug=slugify(req.name),
        description=req.description,
        city=req.city,
        province=req.province,
        country=req.country,
        logo_url=req.logo_url,
        banner_url=req.banner_url,
        website_url=req.website_url,
    )
    db.add(org)
    await db.flush()

    membership = Membership(
        user_id=user.id,
        organization_id=org.id,
        role=MembershipRole.ORG_OWNER,
        granted_by=user.id,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Organization)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(
            Organization.deleted_at.is_(None),
            Membership.user_id == user.id,
            Membership.is_active == True,
        )
        .distinct()
        .order_by(Organization.name.asc())
    )
    return result.scalars().all()


@router.get("/{id}", response_model=OrganizationResponse)
async def get_organization(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_org_with_membership(db, id, user)


@router.patch("/{id}", response_model=OrganizationResponse)
async def update_organization(
    id: UUID,
    req: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org = await get_org_with_membership(db, id, user)
    data = req.model_dump(exclude_unset=True)

    if data.pop("deleted", None):
        org.deleted_at = datetime.now(timezone.utc)
    else:
        for k, v in data.items():
            setattr(org, k, v)
        if "name" in data and data["name"]:
            org.slug = slugify(data["name"])

    org.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(org)
    return org
