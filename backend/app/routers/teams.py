"""Teams router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organization, Competition, Season, Team
from app.deps import get_current_user
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse

router = APIRouter(prefix="/teams", tags=["teams"])


async def verify_edition_ownership(db: AsyncSession, season_id: UUID, user: User):
    if user.role.value == 'admin':
        return
    result = await db.execute(
        select(Season).join(Competition).join(Organization).where(Season.id == season_id, Organization.created_by_user_id == user.id, Season.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Season not owned by user")

async def get_team_with_ownership(db: AsyncSession, team_id: UUID, user: User) -> Team:
    result = await db.execute(
        select(Team).join(Season).join(Competition).join(Organization).where(Team.id == team_id, Organization.created_by_user_id == user.id, Team.deleted_at.is_(None))
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(req: TeamCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, req.season_id, user)
    t = Team(**req.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


@router.get("", response_model=list[TeamResponse])
async def list_teams(season_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, season_id, user)
    result = await db.execute(select(Team).where(Team.season_id == season_id, Team.deleted_at.is_(None)))
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
