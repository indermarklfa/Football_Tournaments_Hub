"""Teams router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser, Tournament, Edition, Team
from app.deps import get_current_user
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse

router = APIRouter(prefix="/teams", tags=["teams"])


async def verify_edition_ownership(db: AsyncSession, edition_id: UUID, user: User):
    result = await db.execute(
        select(Edition).join(Tournament).join(Organiser).where(Edition.id == edition_id, Organiser.owner_user_id == user.id, Edition.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Edition not owned by user")


async def get_team_with_ownership(db: AsyncSession, team_id: UUID, user: User) -> Team:
    result = await db.execute(
        select(Team).join(Edition).join(Tournament).join(Organiser).where(Team.id == team_id, Organiser.owner_user_id == user.id, Team.deleted_at.is_(None))
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(req: TeamCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, req.edition_id, user)
    t = Team(**req.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


@router.get("", response_model=list[TeamResponse])
async def list_teams(edition_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, edition_id, user)
    result = await db.execute(select(Team).where(Team.edition_id == edition_id, Team.deleted_at.is_(None)))
    return result.scalars().all()


@router.patch("/{id}", response_model=TeamResponse)
async def update_team(id: UUID, req: TeamUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = await get_team_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    if data.pop("deleted", None):
        t.deleted_at = datetime.now(timezone.utc)
    for k, v in data.items():
        setattr(t, k, v)
    await db.commit()
    await db.refresh(t)
    return t
