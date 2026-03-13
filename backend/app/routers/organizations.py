"""Organizations router"""
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
from app.models import User, UserRole, Organization, Membership

router = APIRouter(prefix="/organizations", tags=["organizations"])


async def get_org_with_ownership(db: AsyncSession, org_id: UUID, user: User) -> Organization:
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Organization).where(Organization.id == org_id, Organization.deleted_at.is_(None))
        )
    else:
        result = await db.execute(
            select(Organization).where(
                Organization.id == org_id,
                Organization.owner_user_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


class OrganizationCreate(BaseModel):
    name: str
    short_name: Optional[str] = None
    organization_type: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    organization_type: Optional[str] = None
    status: Optional[str] = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    short_name: Optional[str]
    organization_type: Optional[str]
    owner_user_id: UUID
    status: str
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
        name=req.name,
        short_name=req.short_name,
        organization_type=req.organization_type,
        owner_user_id=user.id,
        status="active",
    )
    try:
        db.add(org)
        await db.flush()
        membership = Membership(user_id=user.id, organization_id=org.id, role="owner")
        db.add(membership)
        await db.commit()
        await db.refresh(org)
        return org
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        raise HTTPException(status_code=409, detail="This action conflicts with existing match event data.")


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Organization).where(Organization.deleted_at.is_(None)).order_by(Organization.name)
        )
    else:
        result = await db.execute(
            select(Organization)
            .where(Organization.owner_user_id == user.id, Organization.deleted_at.is_(None))
            .order_by(Organization.name)
        )
    return result.scalars().all()


@router.get("/{id}", response_model=OrganizationResponse)
async def get_organization(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_org_with_ownership(db, id, user)


@router.patch("/{id}", response_model=OrganizationResponse)
async def update_organization(
    id: UUID,
    req: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org = await get_org_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(org, k, v)
    org.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(org)
    return org


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    org = await get_org_with_ownership(db, id, user)
    org.deleted_at = datetime.now(timezone.utc)
    org.updated_at = datetime.now(timezone.utc)
    await db.commit()
