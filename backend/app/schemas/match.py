"""Match schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class MatchCreate(BaseModel):
    edition_id: UUID
    group_id: Optional[UUID] = None
    stage: str = "group"
    matchday: Optional[int] = None
    kickoff_datetime: Optional[datetime] = None
    venue: Optional[str] = None
    home_team_id: UUID
    away_team_id: UUID


class MatchUpdate(BaseModel):
    group_id: Optional[UUID] = None
    stage: Optional[str] = None
    matchday: Optional[int] = None
    kickoff_datetime: Optional[datetime] = None
    venue: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: Optional[str] = None
    deleted: Optional[bool] = None


class MatchResponse(BaseModel):
    id: UUID
    edition_id: UUID
    group_id: Optional[UUID]
    stage: str
    matchday: Optional[int]
    kickoff_datetime: Optional[datetime]
    venue: Optional[str]
    home_team_id: UUID
    away_team_id: UUID
    home_score: Optional[int]
    away_score: Optional[int]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
