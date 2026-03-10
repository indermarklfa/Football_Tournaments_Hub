"""Disciplinary action schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class DisciplinaryActionCreate(BaseModel):
    match_id: UUID
    player_id: UUID
    team_id: UUID
    season_id: UUID
    division_id: Optional[UUID] = None
    action_type: str
    minute: Optional[int] = None
    reason: Optional[str] = None
    suspension_matches: Optional[int] = 0


class DisciplinaryActionUpdate(BaseModel):
    action_type: Optional[str] = None
    minute: Optional[int] = None
    reason: Optional[str] = None
    suspension_matches: Optional[int] = None
    deleted: Optional[bool] = None


class DisciplinaryActionResponse(BaseModel):
    id: UUID
    match_id: UUID
    player_id: UUID
    team_id: UUID
    season_id: UUID
    division_id: Optional[UUID]
    action_type: str
    minute: Optional[int]
    reason: Optional[str]
    suspension_matches: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
