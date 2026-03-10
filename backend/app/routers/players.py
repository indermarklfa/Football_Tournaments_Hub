"""Players router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import (
    User, Organization, Competition, Season, Team,
    Player, PlayerPosition, PlayerRegistration, RegistrationStatus,
)
from app.deps import get_current_user
from app.schemas.player import PlayerCreate, PlayerUpdate, PlayerResponse

router = APIRouter(prefix="/players", tags=["players"])


async def verify_team_ownership(db: AsyncSession, team_id: UUID, user: User):
    result = await db.execute(
        select(Team)
        .join(Season)
        .join(Competition)
        .join(Organization)
        .where(Team.id == team_id, Organization.created_by_user_id == user.id, Team.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Team not owned by user")


async def get_player_with_ownership(db: AsyncSession, player_id: UUID, user: User) -> Player:
    """Look up a player, verifying ownership via their PlayerRegistration → Team chain."""
    result = await db.execute(
        select(Player)
        .join(PlayerRegistration, PlayerRegistration.player_id == Player.id)
        .join(Team, Team.id == PlayerRegistration.team_id)
        .join(Season, Season.id == Team.season_id)
        .join(Competition, Competition.id == Season.competition_id)
        .join(Organization, Organization.id == Competition.organization_id)
        .where(
            Player.id == player_id,
            Organization.created_by_user_id == user.id,
            Player.deleted_at.is_(None),
            PlayerRegistration.deleted_at.is_(None),
        )
        .distinct()
    )
    player = result.scalars().first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.post("", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(req: PlayerCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_team_ownership(db, req.team_id, user)

    data = req.model_dump()

    # Pull out registration-specific fields — not columns on Player
    team_id = data.pop("team_id")
    jersey_number = data.get("jersey_number")

    if data.get("position"):
        data["position"] = PlayerPosition(data["position"])

    # Create the Player record (club_id optional, passed directly if present)
    p = Player(**data)
    db.add(p)
    await db.flush()

    # Derive season_id from the team
    team_result = await db.execute(select(Team).where(Team.id == team_id))
    team = team_result.scalar_one()

    # Create the PlayerRegistration linking player → team + season
    reg = PlayerRegistration(
        player_id=p.id,
        team_id=team_id,
        season_id=team.season_id,
        jersey_number=jersey_number,
        status=RegistrationStatus.APPROVED,
    )
    db.add(reg)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("", response_model=list[PlayerResponse])
async def list_players(team_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_team_ownership(db, team_id, user)
    result = await db.execute(
        select(Player)
        .join(PlayerRegistration, PlayerRegistration.player_id == Player.id)
        .where(
            PlayerRegistration.team_id == team_id,
            PlayerRegistration.deleted_at.is_(None),
            Player.deleted_at.is_(None),
        )
        .order_by(Player.name.asc())
    )
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
