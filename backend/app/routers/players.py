"""Players router"""
from uuid import UUID
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import User, UserRole, Player, PlayerPosition

router = APIRouter(prefix="/players", tags=["players"])


async def get_player_or_404(db: AsyncSession, player_id: UUID) -> Player:
    result = await db.execute(
        select(Player).where(Player.id == player_id, Player.deleted_at.is_(None))
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


class PlayerCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    id_number: Optional[str] = None
    primary_position: Optional[str] = None
    secondary_position: Optional[str] = None


class PlayerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    id_number: Optional[str] = None
    primary_position: Optional[str] = None
    secondary_position: Optional[str] = None
    status: Optional[str] = None


class PlayerResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    date_of_birth: Optional[date]
    gender: Optional[str]
    nationality: Optional[str]
    id_number: Optional[str]
    primary_position: Optional[str]
    secondary_position: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(
    req: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    primary = PlayerPosition(req.primary_position) if req.primary_position else None
    secondary = PlayerPosition(req.secondary_position) if req.secondary_position else None
    player = Player(
        first_name=req.first_name,
        last_name=req.last_name,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        nationality=req.nationality,
        id_number=req.id_number,
        primary_position=primary,
        secondary_position=secondary,
        status="active",
    )
    try:
        db.add(player)
        await db.commit()
        await db.refresh(player)
        return player
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        raise HTTPException(status_code=409, detail="This action conflicts with existing match event data.")

@router.get("", response_model=list[PlayerResponse])
async def search_players(
    q: Optional[str] = None,
    id_number: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    filters = [Player.deleted_at.is_(None)]
    if id_number:
        filters.append(Player.id_number == id_number)
    elif q:
        like = f"%{q}%"
        filters.append(
            or_(
                Player.first_name.ilike(like),
                Player.last_name.ilike(like),
            )
        )
    result = await db.execute(
        select(Player).where(*filters).order_by(Player.last_name, Player.first_name).limit(50)
    )
    return result.scalars().all()


@router.get("/{id}", response_model=PlayerResponse)
async def get_player(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_player_or_404(db, id)


@router.patch("/{id}", response_model=PlayerResponse)
async def update_player(
    id: UUID,
    req: PlayerUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    player = await get_player_or_404(db, id)
    data = req.model_dump(exclude_unset=True)
    if "primary_position" in data and data["primary_position"]:
        data["primary_position"] = PlayerPosition(data["primary_position"])
    if "secondary_position" in data and data["secondary_position"]:
        data["secondary_position"] = PlayerPosition(data["secondary_position"])
    for k, v in data.items():
        setattr(player, k, v)
    player.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(player)
    return player


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_player(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    player = await get_player_or_404(db, id)
    player.deleted_at = datetime.now(timezone.utc)
    player.updated_at = datetime.now(timezone.utc)
    await db.commit()
