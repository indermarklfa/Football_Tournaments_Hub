"""Seasons router"""
import re
from uuid import UUID
from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db import get_db
from app.deps import get_current_user
from app.models import (
    User, Competition, Season, Team, Match, Membership,
    EditionFormat, EditionStatus, MatchStage, MatchStatus,
)

router = APIRouter(prefix="/seasons", tags=["seasons"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


async def verify_competition_access(db: AsyncSession, competition_id: UUID, user: User):
    result = await db.execute(
        select(Competition)
        .join(Membership, Membership.organization_id == Competition.organization_id)
        .where(
            Competition.id == competition_id,
            Competition.deleted_at.is_(None),
            Membership.user_id == user.id,
            Membership.is_active == True,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this competition")


async def get_season_with_access(db: AsyncSession, season_id: UUID, user: User) -> Season:
    result = await db.execute(
        select(Season)
        .join(Competition, Competition.id == Season.competition_id)
        .join(Membership, Membership.organization_id == Competition.organization_id)
        .where(
            Season.id == season_id,
            Season.deleted_at.is_(None),
            Membership.user_id == user.id,
            Membership.is_active == True,
        )
    )
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


class SeasonCreate(BaseModel):
    competition_id: UUID
    name: str
    year: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    venue: Optional[str] = None
    format: Optional[str] = "groups_knockout"
    status: Optional[str] = "upcoming"
    description: Optional[str] = None
    banner_url: Optional[str] = None
    registration_deadline: Optional[date] = None
    max_teams: Optional[int] = None


class SeasonUpdate(BaseModel):
    name: Optional[str] = None
    year: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    venue: Optional[str] = None
    format: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    banner_url: Optional[str] = None
    registration_deadline: Optional[date] = None
    max_teams: Optional[int] = None
    deleted: Optional[bool] = None


class SeasonResponse(BaseModel):
    id: UUID
    competition_id: UUID
    name: str
    slug: Optional[str]
    year: int
    start_date: Optional[date]
    end_date: Optional[date]
    venue: Optional[str]
    format: EditionFormat
    status: EditionStatus
    description: Optional[str]
    banner_url: Optional[str]
    registration_deadline: Optional[date]
    max_teams: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamResponse(BaseModel):
    id: UUID
    season_id: UUID
    name: str
    slug: Optional[str]
    short_name: Optional[str]
    logo_url: Optional[str]
    is_public: bool

    class Config:
        from_attributes = True


@router.post("", response_model=SeasonResponse, status_code=status.HTTP_201_CREATED)
async def create_season(
    req: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_competition_access(db, req.competition_id, user)

    season = Season(
        competition_id=req.competition_id,
        name=req.name,
        slug=slugify(req.name),
        year=req.year,
        start_date=req.start_date,
        end_date=req.end_date,
        venue=req.venue,
        format=EditionFormat(req.format) if req.format else EditionFormat.GROUPS_KNOCKOUT,
        status=EditionStatus(req.status) if req.status else EditionStatus.UPCOMING,
        description=req.description,
        banner_url=req.banner_url,
        registration_deadline=req.registration_deadline,
        max_teams=req.max_teams,
    )
    db.add(season)
    await db.commit()
    await db.refresh(season)
    return season


@router.get("", response_model=list[SeasonResponse])
async def list_seasons(
    competition_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_competition_access(db, competition_id, user)

    result = await db.execute(
        select(Season)
        .where(
            Season.competition_id == competition_id,
            Season.deleted_at.is_(None),
        )
        .order_by(Season.year.desc())
    )
    return result.scalars().all()


@router.get("/{id}", response_model=SeasonResponse)
async def get_season(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await get_season_with_access(db, id, user)


@router.patch("/{id}", response_model=SeasonResponse)
async def update_season(
    id: UUID,
    req: SeasonUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    season = await get_season_with_access(db, id, user)
    data = req.model_dump(exclude_unset=True)

    if data.pop("deleted", None):
        season.deleted_at = datetime.now(timezone.utc)
    else:
        if "format" in data and data["format"]:
            data["format"] = EditionFormat(data["format"])
        if "status" in data and data["status"]:
            data["status"] = EditionStatus(data["status"])
        for k, v in data.items():
            setattr(season, k, v)
        if "name" in data and data["name"]:
            season.slug = slugify(data["name"])

    season.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(season)
    return season


@router.get("/{id}/alive-teams", response_model=list[TeamResponse])
async def get_alive_teams(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return teams in this season that have not lost a knockout match."""
    await get_season_with_access(db, id, user)

    # Load all teams in this season
    teams_result = await db.execute(
        select(Team).where(Team.season_id == id, Team.deleted_at.is_(None))
    )
    teams = {t.id: t for t in teams_result.scalars().all()}

    if not teams:
        return []

    # Load all completed knockout matches
    knockout_stages = [
        MatchStage.ROUND_OF_16,
        MatchStage.QUARTERFINAL,
        MatchStage.SEMIFINAL,
        MatchStage.THIRD_PLACE,
        MatchStage.FINAL,
    ]
    matches_result = await db.execute(
        select(Match).where(
            Match.season_id == id,
            Match.stage.in_(knockout_stages),
            Match.status == MatchStatus.COMPLETED,
            Match.deleted_at.is_(None),
        )
    )
    matches = matches_result.scalars().all()

    # Determine eliminated teams (losers)
    eliminated: set[UUID] = set()
    for m in matches:
        # Determine winner by score, then penalties
        if m.home_score > m.away_score:
            eliminated.add(m.away_team_id)
        elif m.away_score > m.home_score:
            eliminated.add(m.home_team_id)
        elif m.home_penalties is not None and m.away_penalties is not None:
            if m.home_penalties > m.away_penalties:
                eliminated.add(m.away_team_id)
            elif m.away_penalties > m.home_penalties:
                eliminated.add(m.home_team_id)

    return [t for tid, t in teams.items() if tid not in eliminated]
