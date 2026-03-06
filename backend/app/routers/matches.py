"""Matches router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser, Tournament, Edition, Match, MatchStage, MatchStatus
from app.deps import get_current_user
from app.schemas.match import MatchCreate, MatchUpdate, MatchResponse

router = APIRouter(prefix="/matches", tags=["matches"])


async def verify_edition_ownership(db: AsyncSession, edition_id: UUID, user: User):
    result = await db.execute(
        select(Edition).join(Tournament).join(Organiser).where(Edition.id == edition_id, Organiser.owner_user_id == user.id, Edition.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Edition not owned by user")


async def get_match_with_ownership(db: AsyncSession, match_id: UUID, user: User) -> Match:
    result = await db.execute(
        select(Match).join(Edition).join(Tournament).join(Organiser).where(Match.id == match_id, Organiser.owner_user_id == user.id, Match.deleted_at.is_(None))
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m


@router.post("", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
async def create_match(req: MatchCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, req.edition_id, user)
    data = req.model_dump()
    data["stage"] = MatchStage(data["stage"])
    m = Match(**data)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@router.get("", response_model=list[MatchResponse])
async def list_matches(edition_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, edition_id, user)
    result = await db.execute(select(Match).where(Match.edition_id == edition_id, Match.deleted_at.is_(None)))
    return result.scalars().all()


@router.patch("/{id}", response_model=MatchResponse)
async def update_match(id: UUID, req: MatchUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    m = await get_match_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    if data.pop("deleted", None):
        m.deleted_at = datetime.now(timezone.utc)
    if "stage" in data:
        data["stage"] = MatchStage(data["stage"])
    if "status" in data:
        data["status"] = MatchStatus(data["status"])
    for k, v in data.items():
        setattr(m, k, v)
    await db.commit()
    await db.refresh(m)
    return m

@router.post("/{id}/delete", response_model=MatchResponse)
async def delete_match(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    m = await get_match_with_ownership(db, id, user)
    m.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(m)
    return m