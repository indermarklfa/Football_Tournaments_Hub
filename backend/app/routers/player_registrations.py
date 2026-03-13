"""Player registrations router"""
from uuid import UUID
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import (
    User, UserRole, Organization, Competition, Season, Division, Team, PlayerRegistration, Player,
)
from app.services.validation import ValidationError, validate_registration_creation

router = APIRouter(prefix="/player-registrations", tags=["player-registrations"])


async def verify_team_ownership(db: AsyncSession, team_id: UUID, user: User):
    if user.role == UserRole.ADMIN:
        return
    result = await db.execute(
        select(Team)
        .join(Division, Division.id == Team.division_id)
        .join(Season, Season.id == Division.season_id)
        .join(Competition, Competition.id == Season.competition_id)
        .join(Organization, Organization.id == Competition.organization_id)
        .where(
            Team.id == team_id,
            Team.deleted_at.is_(None),
            Organization.owner_user_id == user.id,
            Organization.deleted_at.is_(None),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this team")


async def get_registration_with_ownership(db: AsyncSession, reg_id: UUID, user: User) -> PlayerRegistration:
    result = await db.execute(select(PlayerRegistration).where(PlayerRegistration.id == reg_id))
    reg = result.scalar_one_or_none()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    await verify_team_ownership(db, reg.team_id, user)
    return reg

async def ensure_unique_squad_number(
    db: AsyncSession,
    team_id: UUID,
    squad_number: Optional[int],
    exclude_registration_id: Optional[UUID] = None,
) -> None:
    if squad_number is None:
        return

    stmt = select(PlayerRegistration).where(
        PlayerRegistration.team_id == team_id,
        PlayerRegistration.status == "active",
        PlayerRegistration.squad_number == squad_number,
    )

    if exclude_registration_id is not None:
        stmt = stmt.where(PlayerRegistration.id != exclude_registration_id)

    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Squad number {squad_number} is already in use for this team.",
        )

class PlayerRegistrationCreate(BaseModel):
    player_id: UUID
    team_id: UUID
    membership_id: Optional[UUID] = None
    registration_type: Optional[str] = "standard"
    squad_number: Optional[int] = None
    registered_on: Optional[date] = None


class PlayerRegistrationUpdate(BaseModel):
    squad_number: Optional[int] = None
    status: Optional[str] = None
    deregistered_on: Optional[date] = None

class PlayerMiniResponse(BaseModel):
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

    class Config:
        from_attributes = True

class PlayerRegistrationResponse(BaseModel):
    id: UUID
    player_id: UUID
    team_id: UUID
    membership_id: Optional[UUID]
    registration_type: str
    status: str
    squad_number: Optional[int]
    registered_on: Optional[date]
    deregistered_on: Optional[date]
    created_at: datetime
    updated_at: datetime
    player: Optional[PlayerMiniResponse] = None

    class Config:
        from_attributes = True


@router.post("", response_model=PlayerRegistrationResponse, status_code=status.HTTP_201_CREATED)
async def create_registration(
    req: PlayerRegistrationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_team_ownership(db, req.team_id, user)
    await ensure_unique_squad_number(
        db,
        team_id=req.team_id,
        squad_number=req.squad_number,
    )
    existing_stmt = select(PlayerRegistration).where(
        PlayerRegistration.player_id == req.player_id,
        PlayerRegistration.team_id == req.team_id,
    )
    existing_reg = (await db.execute(existing_stmt)).scalar_one_or_none()

    if existing_reg:
        if existing_reg.status in ["inactive", "cancelled"] or existing_reg.deregistered_on is not None:
            await ensure_unique_squad_number(
                db,
                team_id=req.team_id,
                squad_number=req.squad_number,
                exclude_registration_id=existing_reg.id,
            )
            
            existing_reg.status = "active"
            existing_reg.deregistered_on = None
            existing_reg.registered_on = req.registered_on or date.today()
            existing_reg.registration_type = req.registration_type or existing_reg.registration_type or "standard"
            existing_reg.membership_id = req.membership_id
            existing_reg.squad_number = req.squad_number
            existing_reg.updated_at = datetime.now(timezone.utc)

            await db.commit()
            result = await db.execute(
                select(PlayerRegistration)
                .options(selectinload(PlayerRegistration.player))
                .where(PlayerRegistration.id == existing_reg.id)
            )
            return result.scalar_one()

        raise HTTPException(status_code=409, detail="This player is already registered to this team.")
    try:
        await validate_registration_creation(
            db,
            player_id=req.player_id,
            team_id=req.team_id,
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)

    reg = PlayerRegistration(
        player_id=req.player_id,
        team_id=req.team_id,
        membership_id=req.membership_id,
        registration_type=req.registration_type or "standard",
        squad_number=req.squad_number,
        registered_on=req.registered_on or date.today(),
        status="active",
    )
    try:
        db.add(reg)
        await db.commit()
        result = await db.execute(
            select(PlayerRegistration)
            .options(selectinload(PlayerRegistration.player))
            .where(PlayerRegistration.id == reg.id)
        )
        return result.scalar_one()
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        if "uq_registration_player_team" in msg:
            raise HTTPException(status_code=409, detail="This player is already registered to this team.")
        raise HTTPException(status_code=409, detail="This action conflicts with existing registration data.")


@router.get("", response_model=list[PlayerRegistrationResponse])
async def list_registrations(
    team_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_team_ownership(db, team_id, user)
    result = await db.execute(
        select(PlayerRegistration)
        .options(selectinload(PlayerRegistration.player))
        .where(
            PlayerRegistration.team_id == team_id,
            PlayerRegistration.status == "active",
        )
        .order_by(PlayerRegistration.squad_number)
    )
    return result.scalars().all()


@router.patch("/{id}", response_model=PlayerRegistrationResponse)
async def update_registration(
    id: UUID,
    req: PlayerRegistrationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    reg = await get_registration_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)
    new_squad_number = data["squad_number"] if "squad_number" in data else reg.squad_number

    await ensure_unique_squad_number(
        db,
        team_id=reg.team_id,
        squad_number=new_squad_number,
        exclude_registration_id=reg.id,
    )
    for k, v in data.items():
        setattr(reg, k, v)
    reg.updated_at = datetime.now(timezone.utc)
    await db.commit()
    result = await db.execute(
        select(PlayerRegistration)
        .options(selectinload(PlayerRegistration.player))
        .where(PlayerRegistration.id == reg.id)
    )
    return result.scalar_one()


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def deregister_player(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    reg = await get_registration_with_ownership(db, id, user)
    reg.deregistered_on = date.today()
    reg.status = "inactive"
    reg.updated_at = datetime.now(timezone.utc)
    await db.commit()
