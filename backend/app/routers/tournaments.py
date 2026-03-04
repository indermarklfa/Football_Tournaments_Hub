"""Tournaments router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser, Tournament
from app.deps import get_current_user
from app.schemas.tournament import TournamentCreate, TournamentUpdate, TournamentResponse

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


async def verify_organiser_ownership(db: AsyncSession, organiser_id: UUID, user: User):
    result = await db.execute(select(Organiser).where(Organiser.id == organiser_id, Organiser.owner_user_id == user.id, Organiser.deleted_at.is_(None)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Organiser not owned by user")


@router.post("", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
async def create_tournament(req: TournamentCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_organiser_ownership(db, req.organiser_id, user)
    t = Tournament(**req.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


@router.get("", response_model=list[TournamentResponse])
async def list_tournaments(organiser_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_organiser_ownership(db, organiser_id, user)
    result = await db.execute(select(Tournament).where(Tournament.organiser_id == organiser_id, Tournament.deleted_at.is_(None)))
    return result.scalars().all()


@router.get("/{id}", response_model=TournamentResponse)
async def get_tournament(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Tournament).join(Organiser).where(Tournament.id == id, Organiser.owner_user_id == user.id, Tournament.deleted_at.is_(None))
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return t


@router.patch("/{id}", response_model=TournamentResponse)
async def update_tournament(id: UUID, req: TournamentUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Tournament).join(Organiser).where(Tournament.id == id, Organiser.owner_user_id == user.id, Tournament.deleted_at.is_(None))
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    data = req.model_dump(exclude_unset=True)
    if data.pop("deleted", None):
        t.deleted_at = datetime.now(timezone.utc)
    for k, v in data.items():
        setattr(t, k, v)
    await db.commit()
    await db.refresh(t)
    return t
