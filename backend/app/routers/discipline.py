"""Disciplinary actions router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.deps import get_current_user
from app.models import User, Match, Season, Competition, Organization, DisciplinaryAction
from app.schemas.discipline import (
    DisciplinaryActionCreate,
    DisciplinaryActionUpdate,
    DisciplinaryActionResponse,
)

router = APIRouter(tags=["discipline"])


async def verify_match_ownership(db: AsyncSession, match_id: UUID, user: User):
    if user.role == "admin":
        return
    result = await db.execute(
        select(Match)
        .join(Season, Season.id == Match.season_id)
        .join(Competition, Competition.id == Season.competition_id)
        .join(Organization, Organization.id == Competition.organization_id)
        .where(
            Match.id == match_id,
            Match.deleted_at.is_(None),
            Organization.created_by_user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this match")


async def get_action_with_ownership(
    db: AsyncSession, action_id: UUID, user: User
) -> DisciplinaryAction:
    if user.role == "admin":
        result = await db.execute(
            select(DisciplinaryAction).where(
                DisciplinaryAction.id == action_id,
                DisciplinaryAction.deleted_at.is_(None),
            )
        )
    else:
        result = await db.execute(
            select(DisciplinaryAction)
            .join(Match, Match.id == DisciplinaryAction.match_id)
            .join(Season, Season.id == Match.season_id)
            .join(Competition, Competition.id == Season.competition_id)
            .join(Organization, Organization.id == Competition.organization_id)
            .where(
                DisciplinaryAction.id == action_id,
                DisciplinaryAction.deleted_at.is_(None),
                Organization.created_by_user_id == user.id,
            )
        )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Disciplinary action not found")
    return action


@router.post("/discipline", response_model=DisciplinaryActionResponse, status_code=status.HTTP_201_CREATED)
async def create_disciplinary_action(
    req: DisciplinaryActionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_match_ownership(db, req.match_id, user)
    action = DisciplinaryAction(
        match_id=req.match_id,
        player_id=req.player_id,
        team_id=req.team_id,
        season_id=req.season_id,
        division_id=req.division_id,
        action_type=req.action_type,
        minute=req.minute,
        reason=req.reason,
        suspension_matches=req.suspension_matches,
    )
    db.add(action)
    await db.commit()
    await db.refresh(action)
    return action


@router.get("/discipline/suspensions", response_model=list[DisciplinaryActionResponse])
async def list_suspensions(
    season_id: Optional[UUID] = None,
    division_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(DisciplinaryAction).where(
        DisciplinaryAction.deleted_at.is_(None),
        DisciplinaryAction.suspension_matches > 0,
    )
    if season_id is not None:
        query = query.where(DisciplinaryAction.season_id == season_id)
    if division_id is not None:
        query = query.where(DisciplinaryAction.division_id == division_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/discipline", response_model=list[DisciplinaryActionResponse])
async def list_disciplinary_actions(
    season_id: Optional[UUID] = None,
    player_id: Optional[UUID] = None,
    team_id: Optional[UUID] = None,
    division_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(DisciplinaryAction).where(
        DisciplinaryAction.deleted_at.is_(None),
    )
    if season_id is not None:
        query = query.where(DisciplinaryAction.season_id == season_id)
    if player_id is not None:
        query = query.where(DisciplinaryAction.player_id == player_id)
    if team_id is not None:
        query = query.where(DisciplinaryAction.team_id == team_id)
    if division_id is not None:
        query = query.where(DisciplinaryAction.division_id == division_id)
    query = query.order_by(DisciplinaryAction.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/discipline/{id}", response_model=DisciplinaryActionResponse)
async def get_disciplinary_action(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_action_with_ownership(db, id, user)


@router.patch("/discipline/{id}", response_model=DisciplinaryActionResponse)
async def update_disciplinary_action(
    id: UUID,
    req: DisciplinaryActionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    action = await get_action_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)

    if data.pop("deleted", None):
        action.deleted_at = datetime.now(timezone.utc)
    else:
        for k, v in data.items():
            setattr(action, k, v)

    action.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(action)
    return action
