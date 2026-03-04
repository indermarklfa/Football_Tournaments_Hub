"""Match events router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser, Tournament, Edition, Match, MatchEvent, EventType, Player
from app.deps import get_current_user
from app.schemas.match_event import MatchEventCreate, MatchEventUpdate, MatchEventOut

router = APIRouter(prefix="/match-events", tags=["match-events"])


async def get_match_with_ownership(db: AsyncSession, match_id: UUID, user: User) -> Match:
    result = await db.execute(
        select(Match)
        .join(Edition)
        .join(Tournament)
        .join(Organiser)
        .where(Match.id == match_id, Organiser.owner_user_id == user.id, Match.deleted_at.is_(None))
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found or not owned")
    return match


async def validate_team_in_match(match: Match, team_id: UUID):
    if team_id not in (match.home_team_id, match.away_team_id):
        raise HTTPException(status_code=400, detail="Team not in this match")


async def validate_player_in_team(db: AsyncSession, player_id: UUID, team_id: UUID):
    result = await db.execute(
        select(Player).where(Player.id == player_id, Player.team_id == team_id, Player.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Player not in this team")


@router.post("", response_model=MatchEventOut, status_code=status.HTTP_201_CREATED)
async def create_match_event(req: MatchEventCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    match = await get_match_with_ownership(db, req.match_id, user)
    await validate_team_in_match(match, req.team_id)
    if req.player_id:
        await validate_player_in_team(db, req.player_id, req.team_id)
    event = MatchEvent(
        match_id=req.match_id,
        team_id=req.team_id,
        player_id=req.player_id,
        event_type=EventType(req.event_type),
        minute=req.minute,
        additional_info=req.additional_info,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("", response_model=list[MatchEventOut])
async def list_match_events(match_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await get_match_with_ownership(db, match_id, user)
    result = await db.execute(
        select(MatchEvent)
        .where(MatchEvent.match_id == match_id, MatchEvent.deleted_at.is_(None))
        .order_by(MatchEvent.minute.asc(), MatchEvent.created_at.asc())
    )
    return result.scalars().all()


@router.patch("/{event_id}", response_model=MatchEventOut)
async def update_match_event(event_id: UUID, req: MatchEventUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(MatchEvent)
        .join(Match)
        .join(Edition)
        .join(Tournament)
        .join(Organiser)
        .where(MatchEvent.id == event_id, Organiser.owner_user_id == user.id, MatchEvent.deleted_at.is_(None))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Match event not found")
    
    match_result = await db.execute(select(Match).where(Match.id == event.match_id))
    match = match_result.scalar_one()
    
    data = req.model_dump(exclude_unset=True)
    if "team_id" in data:
        await validate_team_in_match(match, data["team_id"])
    if "player_id" in data and data["player_id"]:
        team_id = data.get("team_id", event.team_id)
        await validate_player_in_team(db, data["player_id"], team_id)
    if "event_type" in data:
        data["event_type"] = EventType(data["event_type"])
    for k, v in data.items():
        setattr(event, k, v)
    await db.commit()
    await db.refresh(event)
    return event


@router.post("/{event_id}/delete", response_model=MatchEventOut)
async def delete_match_event(event_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(MatchEvent)
        .join(Match)
        .join(Edition)
        .join(Tournament)
        .join(Organiser)
        .where(MatchEvent.id == event_id, Organiser.owner_user_id == user.id, MatchEvent.deleted_at.is_(None))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Match event not found")
    event.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(event)
    return event
