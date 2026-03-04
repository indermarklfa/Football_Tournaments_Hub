"""Match event schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Any


class MatchEventCreate(BaseModel):
    match_id: UUID
    team_id: UUID
    player_id: Optional[UUID] = None
    event_type: str
    minute: int
    additional_info: Optional[dict[str, Any]] = None


class MatchEventUpdate(BaseModel):
    team_id: Optional[UUID] = None
    player_id: Optional[UUID] = None
    event_type: Optional[str] = None
    minute: Optional[int] = None
    additional_info: Optional[dict[str, Any]] = None


class MatchEventOut(BaseModel):
    id: UUID
    match_id: UUID
    team_id: UUID
    player_id: Optional[UUID]
    event_type: str
    minute: int
    additional_info: Optional[dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
