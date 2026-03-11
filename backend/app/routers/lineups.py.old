"""Lineups router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.deps import get_current_user
from app.models import User, Match, Season, Competition, Organization, Lineup
from app.schemas.lineup import LineupCreate, LineupUpdate, LineupResponse

router = APIRouter(tags=["lineups"])


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


async def get_lineup_with_ownership(db: AsyncSession, lineup_id: UUID, user: User) -> Lineup:
    if user.role == "admin":
        result = await db.execute(
            select(Lineup).where(
                Lineup.id == lineup_id,
                Lineup.deleted_at.is_(None),
            )
        )
    else:
        result = await db.execute(
            select(Lineup)
            .join(Match, Match.id == Lineup.match_id)
            .join(Season, Season.id == Match.season_id)
            .join(Competition, Competition.id == Season.competition_id)
            .join(Organization, Organization.id == Competition.organization_id)
            .where(
                Lineup.id == lineup_id,
                Lineup.deleted_at.is_(None),
                Organization.created_by_user_id == user.id,
            )
        )
    lineup = result.scalar_one_or_none()
    if not lineup:
        raise HTTPException(status_code=404, detail="Lineup entry not found")
    return lineup


@router.post("/lineups", response_model=LineupResponse, status_code=status.HTTP_201_CREATED)
async def create_lineup(
    req: LineupCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_match_ownership(db, req.match_id, user)
    lineup = Lineup(
        match_id=req.match_id,
        team_id=req.team_id,
        player_id=req.player_id,
        starting=req.starting,
        jersey_number=req.jersey_number,
        position=req.position,
    )
    db.add(lineup)
    await db.commit()
    await db.refresh(lineup)
    return lineup


@router.get("/lineups", response_model=list[LineupResponse])
async def list_lineups(
    match_id: UUID,
    team_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_match_ownership(db, match_id, user)
    query = select(Lineup).where(
        Lineup.match_id == match_id,
        Lineup.deleted_at.is_(None),
    )
    if team_id is not None:
        query = query.where(Lineup.team_id == team_id)
    query = query.order_by(Lineup.starting.desc(), Lineup.jersey_number)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/lineups/{id}", response_model=LineupResponse)
async def get_lineup(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_lineup_with_ownership(db, id, user)


@router.patch("/lineups/{id}", response_model=LineupResponse)
async def update_lineup(
    id: UUID,
    req: LineupUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lineup = await get_lineup_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)

    if data.pop("deleted", None):
        lineup.deleted_at = datetime.now(timezone.utc)
    else:
        for k, v in data.items():
            setattr(lineup, k, v)

    lineup.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(lineup)
    return lineup
