"""Match events router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.services.validation import ValidationError, validate_event_creation
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import (
    User, UserRole, Organization, Competition, Season, Division, Match, MatchEvent, EventType, MatchStatus,
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

async def get_match_event_with_ownership(db: AsyncSession, event_id: UUID, user: User) -> MatchEvent:
    result = await db.execute(select(MatchEvent).where(MatchEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    await get_match_with_ownership(db, event.match_id, user)
    return event

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

class MatchEventUpdate(BaseModel):
    team_id: Optional[UUID] = None
    player_id: Optional[UUID] = None
    related_player_id: Optional[UUID] = None
    registration_id: Optional[UUID] = None
    minute: Optional[int] = None
    extra_minute: Optional[int] = None
    event_type: Optional[str] = None
    notes: Optional[str] = None

async def recalc_match_scores(db: AsyncSession, match_id):
    match_result = await db.execute(select(Match).where(Match.id == match_id))
    match = match_result.scalar_one_or_none()
    if not match:
        return

    events_result = await db.execute(
        select(MatchEvent).where(MatchEvent.match_id == match_id)
    )
    events = events_result.scalars().all()

    home_score = 0
    away_score = 0
    home_penalties = 0
    away_penalties = 0
    home_shootout_kicks = 0
    away_shootout_kicks = 0

    for e in events:
        event_type = e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type)

        if event_type == "goal":
            if e.team_id == match.home_team_id:
                home_score += 1
            elif e.team_id == match.away_team_id:
                away_score += 1

        elif event_type == "own_goal":
            if e.team_id == match.home_team_id:
                away_score += 1
            elif e.team_id == match.away_team_id:
                home_score += 1

        elif event_type == "penalty_scored":
            if e.team_id == match.home_team_id:
                home_score += 1
            elif e.team_id == match.away_team_id:
                away_score += 1

        elif event_type == "penalty_shootout_scored":
            if e.team_id == match.home_team_id:
                home_penalties += 1
                home_shootout_kicks += 1
            elif e.team_id == match.away_team_id:
                away_penalties += 1
                away_shootout_kicks += 1

        elif event_type == "penalty_shootout_missed":
            if e.team_id == match.home_team_id:
                home_shootout_kicks += 1
            elif e.team_id == match.away_team_id:
                away_shootout_kicks += 1

    match.home_score = home_score
    match.away_score = away_score
    match.home_penalties = home_penalties if (home_shootout_kicks > 0 or away_shootout_kicks > 0) else None
    match.away_penalties = away_penalties if (home_shootout_kicks > 0 or away_shootout_kicks > 0) else None

    shootout_decided = False

    if home_shootout_kicks > 0 or away_shootout_kicks > 0:
        # First 5 kicks each
        if home_shootout_kicks <= 5 and away_shootout_kicks <= 5:
            home_remaining = 5 - home_shootout_kicks
            away_remaining = 5 - away_shootout_kicks

            if home_penalties > away_penalties + away_remaining:
                shootout_decided = True
            elif away_penalties > home_penalties + home_remaining:
                shootout_decided = True

        # Sudden death
        elif (
            home_shootout_kicks >= 5
            and away_shootout_kicks >= 5
            and home_shootout_kicks == away_shootout_kicks
            and home_penalties != away_penalties
        ):
            shootout_decided = True

        match.status = MatchStatus.COMPLETED if shootout_decided else MatchStatus.PENALTIES
    else:
        match.home_penalties = None
        match.away_penalties = None
        if match.status == MatchStatus.PENALTIES:
            match.status = MatchStatus.LIVE

@router.post("", response_model=MatchEventResponse, status_code=status.HTTP_201_CREATED)
async def create_match_event(
    req: MatchEventCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await get_match_with_ownership(db, req.match_id, user)

    try:
        await validate_event_creation(
            db,
            match_id=req.match_id,
            team_id=req.team_id,
            player_id=req.player_id,
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)

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
    try:
        db.add(event)
        await db.flush()
        await recalc_match_scores(db, req.match_id)
        await db.commit()
        await db.refresh(event)
        return event
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        raise HTTPException(status_code=409, detail="This action conflicts with existing match event data.")


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

@router.patch("/{id}", response_model=MatchEventResponse)
async def update_match_event(
    id: UUID,
    req: MatchEventUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = await get_match_event_with_ownership(db, id, user)
    data = req.model_dump(exclude_unset=True)

    if "event_type" in data and data["event_type"]:
        data["event_type"] = EventType(data["event_type"])

    match_id = event.match_id

    for k, v in data.items():
        setattr(event, k, v)

    await db.flush()
    await recalc_match_scores(db, match_id)
    await db.commit()
    await db.refresh(event)
    return event

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
    match_id = event.match_id
    await db.delete(event)
    await db.flush()
    await recalc_match_scores(db, match_id)
    await db.commit()
