"""Editions router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organiser, Tournament, Edition, EditionFormat, EditionStatus
from app.deps import get_current_user
from app.schemas.edition import EditionCreate, EditionUpdate, EditionResponse

router = APIRouter(prefix="/editions", tags=["editions"])


async def verify_tournament_ownership(db: AsyncSession, tournament_id: UUID, user: User):
    result = await db.execute(
        select(Tournament).join(Organiser).where(Tournament.id == tournament_id, Organiser.owner_user_id == user.id, Tournament.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Tournament not owned by user")


@router.post("", response_model=EditionResponse, status_code=status.HTTP_201_CREATED)
async def create_edition(req: EditionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_tournament_ownership(db, req.tournament_id, user)
    data = req.model_dump()
    data["format"] = EditionFormat(data["format"])
    data["status"] = EditionStatus(data["status"])
    e = Edition(**data)
    db.add(e)
    await db.commit()
    await db.refresh(e)
    return e


@router.get("", response_model=list[EditionResponse])
async def list_editions(tournament_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_tournament_ownership(db, tournament_id, user)
    result = await db.execute(select(Edition).where(Edition.tournament_id == tournament_id, Edition.deleted_at.is_(None)))
    return result.scalars().all()


@router.get("/{id}", response_model=EditionResponse)
async def get_edition(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Edition).join(Tournament).join(Organiser).where(Edition.id == id, Organiser.owner_user_id == user.id, Edition.deleted_at.is_(None))
    )
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Edition not found")
    return e


@router.patch("/{id}", response_model=EditionResponse)
async def update_edition(id: UUID, req: EditionUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Edition).join(Tournament).join(Organiser).where(Edition.id == id, Organiser.owner_user_id == user.id, Edition.deleted_at.is_(None))
    )
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Edition not found")
    data = req.model_dump(exclude_unset=True)
    if data.pop("deleted", None):
        e.deleted_at = datetime.now(timezone.utc)
    if "format" in data:
        data["format"] = EditionFormat(data["format"])
    if "status" in data:
        data["status"] = EditionStatus(data["status"])
    for k, v in data.items():
        setattr(e, k, v)
    await db.commit()
    await db.refresh(e)
    return e


@router.get("/{id}/alive-teams")
async def get_alive_teams(id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models import Team, Match, MatchStatus
    result = await db.execute(
        select(Edition).join(Tournament).join(Organiser).where(Edition.id == id, Organiser.owner_user_id == user.id, Edition.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Edition not found")
    
    teams_result = await db.execute(select(Team).where(Team.edition_id == id, Team.deleted_at.is_(None)))
    all_teams = {t.id: t for t in teams_result.scalars().all()}
    
    matches_result = await db.execute(
        select(Match).where(Match.edition_id == id, Match.status == MatchStatus.COMPLETED, Match.deleted_at.is_(None))
    )
    completed_matches = matches_result.scalars().all()
    
    if not completed_matches:
        return [{"id": str(t.id), "name": t.name, "logo_url": t.logo_url} for t in all_teams.values()]
    
    losers = set()
    for m in completed_matches:
        if m.home_score is not None and m.away_score is not None:
            if m.home_score < m.away_score:
                losers.add(m.home_team_id)
            elif m.away_score < m.home_score:
                losers.add(m.away_team_id)
    
    alive = [t for tid, t in all_teams.items() if tid not in losers]
    return [{"id": str(t.id), "name": t.name, "logo_url": t.logo_url} for t in alive]
