"""Competitions router"""
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
from app.models import User, UserRole, Organization, Competition

router = APIRouter(prefix="/competitions", tags=["competitions"])


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


async def get_competition_with_ownership(db: AsyncSession, comp_id: UUID, user: User) -> Competition:
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Competition).where(Competition.id == comp_id, Competition.deleted_at.is_(None))
        )
    else:
        result = await db.execute(
            select(Competition)
            .join(Organization, Organization.id == Competition.organization_id)
            .where(
                Competition.id == comp_id,
                Competition.deleted_at.is_(None),
                Organization.owner_user_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
    return comp


class CompetitionCreate(BaseModel):
    organization_id: UUID
    name: str
    competition_type: Optional[str] = None
    scope_level: Optional[str] = None
    host_structure_id: Optional[UUID] = None


class CompetitionUpdate(BaseModel):
    name: Optional[str] = None
    competition_type: Optional[str] = None
    scope_level: Optional[str] = None
    host_structure_id: Optional[UUID] = None
    status: Optional[str] = None


class CompetitionResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    competition_type: Optional[str]
    scope_level: Optional[str]
    host_structure_id: Optional[UUID]
    status: str
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
    await verify_org_ownership(db, req.organization_id, user)
    comp = Competition(
        organization_id=req.organization_id,
        name=req.name,
        competition_type=req.competition_type,
        scope_level=req.scope_level,
        host_structure_id=req.host_structure_id,
        status="active",
    )
    try:
        db.add(comp)
        await db.commit()
        await db.refresh(comp)
        return comp
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        raise HTTPException(status_code=409, detail="This action conflicts with existing match event data.")


@router.get("", response_model=list[CompetitionResponse])
async def list_competitions(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_org_ownership(db, organization_id, user)
    result = await db.execute(
        select(Competition)
        .where(Competition.organization_id == organization_id, Competition.deleted_at.is_(None))
        .order_by(Competition.name)
    )
    return result.scalars().all()


@router.get("/{id}", response_model=CompetitionResponse)
async def get_competition(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_competition_with_ownership(db, id, user)


@router.patch("/{id}", response_model=CompetitionResponse)
async def update_competition(
    id: UUID,
    req: CompetitionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    comp = await get_competition_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(comp, k, v)
    comp.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competition(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    comp = await get_competition_with_ownership(db, id, user)
    comp.deleted_at = datetime.now(timezone.utc)
    comp.updated_at = datetime.now(timezone.utc)
    await db.commit()
