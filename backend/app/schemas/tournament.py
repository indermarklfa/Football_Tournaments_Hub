"""Tournament schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class TournamentCreate(BaseModel):
    organiser_id: UUID
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None


class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    deleted: Optional[bool] = None


class TournamentResponse(BaseModel):
    id: UUID
    organiser_id: UUID
    name: str
    description: Optional[str]
    logo_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
