"""Officials router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.deps import get_current_user
from app.models import User, Organization, Official, MatchOfficial
from app.schemas.official import (
    OfficialCreate, OfficialUpdate, OfficialResponse,
    MatchOfficialCreate, MatchOfficialResponse,
)

router = APIRouter(tags=["officials"])


async def verify_organization_ownership(db: AsyncSession, organization_id: UUID, user: User):
    if user.role == "admin":
        return
    result = await db.execute(
        select(Organization).where(
            Organization.id == organization_id,
            Organization.deleted_at.is_(None),
            Organization.created_by_user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this organization")


async def get_official_with_ownership(db: AsyncSession, official_id: UUID, user: User) -> Official:
    if user.role == "admin":
        result = await db.execute(
            select(Official).where(
                Official.id == official_id,
                Official.deleted_at.is_(None),
            )
        )
    else:
        result = await db.execute(
            select(Official)
            .join(Organization, Organization.id == Official.organization_id)
            .where(
                Official.id == official_id,
                Official.deleted_at.is_(None),
                Organization.created_by_user_id == user.id,
            )
        )
    official = result.scalar_one_or_none()
    if not official:
        raise HTTPException(status_code=404, detail="Official not found")
    return official


# ---------------------------------------------------------------------------
# Officials CRUD
# ---------------------------------------------------------------------------

@router.get("/officials", response_model=list[OfficialResponse])
async def list_officials(
    organization_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_organization_ownership(db, organization_id, user)
    result = await db.execute(
        select(Official)
        .where(
            Official.organization_id == organization_id,
            Official.deleted_at.is_(None),
        )
        .order_by(Official.name)
    )
    return result.scalars().all()


@router.post("/officials", response_model=OfficialResponse, status_code=status.HTTP_201_CREATED)
async def create_official(
    req: OfficialCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_organization_ownership(db, req.organization_id, user)
    official = Official(
        organization_id=req.organization_id,
        name=req.name,
        role=req.role,
        phone=req.phone,
        email=req.email,
    )
    db.add(official)
    await db.commit()
    await db.refresh(official)
    return official


@router.get("/officials/{id}", response_model=OfficialResponse)
async def get_official(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_official_with_ownership(db, id, user)


@router.patch("/officials/{id}", response_model=OfficialResponse)
async def update_official(
    id: UUID,
    req: OfficialUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    official = await get_official_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)

    if data.pop("deleted", None):
        official.deleted_at = datetime.now(timezone.utc)
    else:
        for k, v in data.items():
            setattr(official, k, v)

    official.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(official)
    return official


# ---------------------------------------------------------------------------
# Match Officials
# ---------------------------------------------------------------------------

@router.post("/match-officials", response_model=MatchOfficialResponse, status_code=status.HTTP_201_CREATED)
async def assign_official_to_match(
    req: MatchOfficialCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verify ownership of the official (implicitly checks org access)
    await get_official_with_ownership(db, req.official_id, user)
    assignment = MatchOfficial(
        match_id=req.match_id,
        official_id=req.official_id,
        role=req.role,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.get("/match-officials", response_model=list[MatchOfficialResponse])
async def list_match_officials(
    match_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MatchOfficial).where(
            MatchOfficial.match_id == match_id,
            MatchOfficial.deleted_at.is_(None),
        )
    )
    return result.scalars().all()


@router.delete("/match-officials/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_match_official(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MatchOfficial).where(MatchOfficial.id == id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(assignment)
    await db.commit()
