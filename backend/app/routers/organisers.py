"""Organisers router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser
from app.deps import get_current_user
from app.schemas.organiser import OrganiserCreate, OrganiserUpdate, OrganiserResponse

router = APIRouter(prefix="/organisers", tags=["organisers"])


@router.post("", response_model=OrganiserResponse, status_code=status.HTTP_201_CREATED)
async def create_organiser(req: OrganiserCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    org = Organiser(owner_user_id=user.id, **req.model_dump())
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("", response_model=list[OrganiserResponse])
async def list_organisers(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Organiser).where(Organiser.owner_user_id == user.id, Organiser.deleted_at.is_(None)))
    return result.scalars().all()


@router.get("/{id}", response_model=OrganiserResponse)
async def get_organiser(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Organiser).where(Organiser.id == id, Organiser.owner_user_id == user.id, Organiser.deleted_at.is_(None)))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organiser not found")
    return org


@router.patch("/{id}", response_model=OrganiserResponse)
async def update_organiser(id: UUID, req: OrganiserUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Organiser).where(Organiser.id == id, Organiser.owner_user_id == user.id, Organiser.deleted_at.is_(None)))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organiser not found")
    data = req.model_dump(exclude_unset=True)
    if data.pop("deleted", None):
        org.deleted_at = datetime.now(timezone.utc)
    for k, v in data.items():
        setattr(org, k, v)
    await db.commit()
    await db.refresh(org)
    return org
