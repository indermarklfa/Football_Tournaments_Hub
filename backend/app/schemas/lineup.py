"""Lineup schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class LineupCreate(BaseModel):
    match_id: UUID
    team_id: UUID
    player_id: UUID
    starting: bool = True
    jersey_number: Optional[int] = None
    position: Optional[str] = None


class LineupUpdate(BaseModel):
    starting: Optional[bool] = None
    jersey_number: Optional[int] = None
    position: Optional[str] = None
    deleted: Optional[bool] = None


class LineupResponse(BaseModel):
    id: UUID
    match_id: UUID
    team_id: UUID
    player_id: UUID
    starting: bool
    jersey_number: Optional[int]
    position: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
