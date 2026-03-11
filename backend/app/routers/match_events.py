"""Match events router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import (
    User, UserRole, Organization, Competition, Season, Division, Match, MatchEvent, EventType,
)

router = APIRouter(prefix="/match-events", tags=["match-events"])


async def get_match_with_ownership(db: AsyncSession, match_id: UUID, user: User) -> Match:
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Match).where(Match.id == match_id, Match.deleted_at.is_(None))
        )
    else:
        result = await db.execute(
            select(Match)
            .join(Division, Division.id == Match.division_id)
            .join(Season, Season.id == Division.season_id)
            .join(Competition, Competition.id == Season.competition_id)
            .join(Organization, Organization.id == Competition.organization_id)
            .where(
                Match.id == match_id,
                Match.deleted_at.is_(None),
                Organization.owner_user_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m


class MatchEventCreate(BaseModel):
    match_id: UUID
    team_id: UUID
    player_id: Optional[UUID] = None
    related_player_id: Optional[UUID] = None
    registration_id: Optional[UUID] = None
    minute: int
    extra_minute: Optional[int] = None
    event_type: str
    notes: Optional[str] = None


class MatchEventResponse(BaseModel):
    id: UUID
    match_id: UUID
    team_id: UUID
    player_id: Optional[UUID]
    related_player_id: Optional[UUID]
    registration_id: Optional[UUID]
    minute: int
    extra_minute: Optional[int]
    event_type: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=MatchEventResponse, status_code=status.HTTP_201_CREATED)
async def create_match_event(
    req: MatchEventCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await get_match_with_ownership(db, req.match_id, user)
    event = MatchEvent(
        match_id=req.match_id,
        team_id=req.team_id,
        player_id=req.player_id,
        related_player_id=req.related_player_id,
        registration_id=req.registration_id,
        minute=req.minute,
        extra_minute=req.extra_minute,
        event_type=EventType(req.event_type),
        notes=req.notes,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("", response_model=list[MatchEventResponse])
async def list_match_events(
    match_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await get_match_with_ownership(db, match_id, user)
    result = await db.execute(
        select(MatchEvent)
        .where(MatchEvent.match_id == match_id)
        .order_by(MatchEvent.minute, MatchEvent.extra_minute)
    )
    return result.scalars().all()


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_match_event(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(MatchEvent).where(MatchEvent.id == id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await get_match_with_ownership(db, event.match_id, user)
    await db.delete(event)
    await db.commit()
