"""Team schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class TeamCreate(BaseModel):
    edition_id: UUID
    name: str
    logo_url: Optional[str] = None
    coach_name: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    coach_name: Optional[str] = None
    deleted: Optional[bool] = None


class TeamResponse(BaseModel):
    id: UUID
    edition_id: UUID
    name: str
    logo_url: Optional[str]
    coach_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
