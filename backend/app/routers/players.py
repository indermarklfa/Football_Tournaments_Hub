"""Players router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser, Tournament, Edition, Team, Player, PlayerPosition
from app.deps import get_current_user
from app.schemas.player import PlayerCreate, PlayerUpdate, PlayerResponse

router = APIRouter(prefix="/players", tags=["players"])


async def verify_team_ownership(db: AsyncSession, team_id: UUID, user: User):
    result = await db.execute(
        select(Team)
        .join(Edition)
        .join(Tournament)
        .join(Organiser)
        .where(Team.id == team_id, Organiser.owner_user_id == user.id, Team.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Team not owned by user")


async def get_player_with_ownership(db: AsyncSession, player_id: UUID, user: User) -> Player:
    result = await db.execute(
        select(Player)
        .join(Team)
        .join(Edition)
        .join(Tournament)
        .join(Organiser)
        .where(Player.id == player_id, Organiser.owner_user_id == user.id, Player.deleted_at.is_(None))
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.post("", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(req: PlayerCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_team_ownership(db, req.team_id, user)
    data = req.model_dump()
    if data.get("position"):
        data["position"] = PlayerPosition(data["position"])
    p = Player(**data)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("", response_model=list[PlayerResponse])
async def list_players(team_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_team_ownership(db, team_id, user)
    result = await db.execute(select(Player).where(Player.team_id == team_id, Player.deleted_at.is_(None)))
    return result.scalars().all()


@router.patch("/{id}", response_model=PlayerResponse)
async def update_player(id: UUID, req: PlayerUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = await get_player_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    if "position" in data and data["position"]:
        data["position"] = PlayerPosition(data["position"])
    for k, v in data.items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return p


@router.post("/{id}/delete", response_model=PlayerResponse)
async def delete_player(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    p = await get_player_with_ownership(db, id, user)
    p.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(p)
    return p
