"""Match events router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser, Tournament, Edition, Match, Team, Player, MatchEvent, EventType, MatchStatus
from app.deps import get_current_user
from app.schemas.match_event import MatchEventCreate, MatchEventUpdate, MatchEventOut

router = APIRouter(prefix="/match-events", tags=["match-events"])

SCORE_EVENTS = {EventType.GOAL, EventType.PENALTY_SCORED, EventType.OWN_GOAL}
SHOOTOUT_EVENTS = {EventType.SHOOTOUT_SCORED, EventType.SHOOTOUT_MISSED}


async def recalculate_score(db: AsyncSession, match: Match):
    """Recalculate home/away score from goal events."""
    result = await db.execute(
        select(MatchEvent).where(
            MatchEvent.match_id == match.id,
            MatchEvent.deleted_at.is_(None),
            MatchEvent.event_type.in_([EventType.GOAL, EventType.PENALTY_SCORED, EventType.OWN_GOAL])
        )
    )
    events = result.scalars().all()
    home_score = 0
    away_score = 0
    for e in events:
        if e.event_type == EventType.OWN_GOAL:
            if e.team_id == match.home_team_id:
                away_score += 1
            else:
                home_score += 1
        else:
            if e.team_id == match.home_team_id:
                home_score += 1
            else:
                away_score += 1
    match.home_score = home_score
    match.away_score = away_score


async def recalculate_shootout(db: AsyncSession, match: Match):
    """Recalculate penalty shootout scores and check for completion."""
    result = await db.execute(
        select(MatchEvent).where(
            MatchEvent.match_id == match.id,
            MatchEvent.deleted_at.is_(None),
            MatchEvent.event_type.in_([EventType.SHOOTOUT_SCORED, EventType.SHOOTOUT_MISSED])
        ).order_by(MatchEvent.created_at.asc())
    )
    events = result.scalars().all()

    # Split by team
    home_kicks = [e for e in events if e.team_id == match.home_team_id]
    away_kicks = [e for e in events if e.team_id == match.away_team_id]

    # Count scores
    home_pens = sum(1 for e in home_kicks if e.event_type == EventType.SHOOTOUT_SCORED)
    away_pens = sum(1 for e in away_kicks if e.event_type == EventType.SHOOTOUT_SCORED)

    match.home_penalties = home_pens
    match.away_penalties = away_pens

    # Check if shootout is decided
    home_count = len(home_kicks)
    away_count = len(away_kicks)
    total_rounds = max(home_count, away_count)

    if total_rounds == 0:
        return

    decided = False

    if total_rounds <= 5:
        # During first 5 rounds — check if mathematically decided
        home_remaining = 5 - home_count
        away_remaining = 5 - away_count
        home_max = home_pens + home_remaining
        away_max = away_pens + away_remaining

        # Home wins if away can't catch up even scoring all remaining
        if home_pens > away_max:
            decided = True
        # Away wins if home can't catch up
        elif away_pens > home_max:
            decided = True
        # All 5 kicks taken by both and scores differ
        elif home_count >= 5 and away_count >= 5 and home_pens != away_pens:
            decided = True
    else:
        # Sudden death — after round 5
        # Each round: home kicks then away kicks
        # Check the latest completed round
        round_num = total_rounds
        if home_count == away_count:
            # Both have kicked this round — check if decided
            round_home = home_kicks[round_num - 1]
            round_away = away_kicks[round_num - 1]
            home_scored = round_home.event_type == EventType.SHOOTOUT_SCORED
            away_scored = round_away.event_type == EventType.SHOOTOUT_SCORED
            if home_scored != away_scored:
                decided = True
        elif home_count > away_count:
            # Home just kicked — check if away can't win even if they score
            # In sudden death: if home missed, away just needs to score to win
            # If home scored, away must score to continue
            round_home = home_kicks[round_num - 1]
            if round_home.event_type == EventType.SHOOTOUT_MISSED:
                # Away just needs to score — not decided yet, wait for away kick
                pass

    if decided:
        match.status = MatchStatus.COMPLETED


async def get_match_with_ownership(db: AsyncSession, match_id: UUID, user: User) -> Match:
    result = await db.execute(
        select(Match).join(Edition).join(Tournament).join(Organiser).where(
            Match.id == match_id,
            Organiser.owner_user_id == user.id,
            Match.deleted_at.is_(None)
        )
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m


async def validate_team_in_match(match: Match, team_id: UUID):
    if team_id not in [match.home_team_id, match.away_team_id]:
        raise HTTPException(status_code=400, detail="Team not in this match")


async def validate_player_in_team(db: AsyncSession, player_id: UUID, team_id: UUID):
    result = await db.execute(
        select(Player).where(Player.id == player_id, Player.team_id == team_id, Player.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Player not in team")


@router.post("", response_model=MatchEventOut, status_code=201)
async def create_match_event(
    req: MatchEventCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    match = await get_match_with_ownership(db, req.match_id, user)
    event_type = EventType(req.event_type)

    await validate_team_in_match(match, req.team_id)
    if req.player_id:
        await validate_player_in_team(db, req.player_id, req.team_id)

    event = MatchEvent(
        match_id=req.match_id,
        team_id=req.team_id,
        player_id=req.player_id,
        event_type=event_type,
        minute=req.minute,
        additional_info=req.additional_info,
    )
    db.add(event)
    await db.flush()

    if event_type in SCORE_EVENTS:
        await recalculate_score(db, match)
    elif event_type in SHOOTOUT_EVENTS:
        await recalculate_shootout(db, match)

    await db.commit()
    await db.refresh(event)
    return event


@router.get("", response_model=list[MatchEventOut])
async def list_match_events(
    match_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    match = await get_match_with_ownership(db, match_id, user)
    result = await db.execute(
        select(MatchEvent).where(
            MatchEvent.match_id == match_id,
            MatchEvent.deleted_at.is_(None)
        ).order_by(MatchEvent.minute.asc(), MatchEvent.created_at.asc())
    )
    return result.scalars().all()


@router.patch("/{event_id}", response_model=MatchEventOut)
async def update_match_event(
    event_id: UUID,
    req: MatchEventUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(MatchEvent).join(Match).join(Edition).join(Tournament).join(Organiser).where(
            MatchEvent.id == event_id,
            Organiser.owner_user_id == user.id,
            MatchEvent.deleted_at.is_(None)
        )
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
async def delete_match_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(MatchEvent).join(Match).join(Edition).join(Tournament).join(Organiser).where(
            MatchEvent.id == event_id,
            Organiser.owner_user_id == user.id,
            MatchEvent.deleted_at.is_(None)
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Match event not found")

    match_result = await db.execute(select(Match).where(Match.id == event.match_id))
    match = match_result.scalar_one()

    event_type = event.event_type
    event.deleted_at = datetime.now(timezone.utc)
    await db.flush()

    if event_type in SCORE_EVENTS:
        await recalculate_score(db, match)
    elif event_type in SHOOTOUT_EVENTS:
        await recalculate_shootout(db, match)

    await db.commit()
    await db.refresh(event)
    return event