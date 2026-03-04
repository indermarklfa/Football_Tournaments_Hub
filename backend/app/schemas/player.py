"""Player schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional


class PlayerCreate(BaseModel):
    team_id: UUID
    name: str
    jersey_number: Optional[int] = None
    position: Optional[str] = None
    date_of_birth: Optional[date] = None


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    jersey_number: Optional[int] = None
    position: Optional[str] = None
    date_of_birth: Optional[date] = None


class PlayerResponse(BaseModel):
    id: UUID
    team_id: UUID
    name: str
    jersey_number: Optional[int]
    position: Optional[str]
    date_of_birth: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True
