"""Editions router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser, Tournament, Edition, EditionFormat, EditionStatus
from app.deps import get_current_user
from app.schemas.edition import EditionCreate, EditionUpdate, EditionResponse

router = APIRouter(prefix="/editions", tags=["editions"])


async def verify_tournament_ownership(db: AsyncSession, tournament_id: UUID, user: User):
    result = await db.execute(
        select(Tournament).join(Organiser).where(Tournament.id == tournament_id, Organiser.owner_user_id == user.id, Tournament.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Tournament not owned by user")


@router.post("", response_model=EditionResponse, status_code=status.HTTP_201_CREATED)
async def create_edition(req: EditionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_tournament_ownership(db, req.tournament_id, user)
    data = req.model_dump()
    data["format"] = EditionFormat(data["format"])
    data["status"] = EditionStatus(data["status"])
    e = Edition(**data)
    db.add(e)
    await db.commit()
    await db.refresh(e)
    return e


@router.get("", response_model=list[EditionResponse])
async def list_editions(tournament_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_tournament_ownership(db, tournament_id, user)
    result = await db.execute(select(Edition).where(Edition.tournament_id == tournament_id, Edition.deleted_at.is_(None)))
    return result.scalars().all()


@router.get("/{id}", response_model=EditionResponse)
async def get_edition(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Edition).join(Tournament).join(Organiser).where(Edition.id == id, Organiser.owner_user_id == user.id, Edition.deleted_at.is_(None))
    )
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Edition not found")
    return e


@router.patch("/{id}", response_model=EditionResponse)
async def update_edition(id: UUID, req: EditionUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Edition).join(Tournament).join(Organiser).where(Edition.id == id, Organiser.owner_user_id == user.id, Edition.deleted_at.is_(None))
    )
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Edition not found")
    data = req.model_dump(exclude_unset=True)
    if data.pop("deleted", None):
        e.deleted_at = datetime.now(timezone.utc)
    if "format" in data:
        data["format"] = EditionFormat(data["format"])
    if "status" in data:
        data["status"] = EditionStatus(data["status"])
    for k, v in data.items():
        setattr(e, k, v)
    await db.commit()
    await db.refresh(e)
    return e
