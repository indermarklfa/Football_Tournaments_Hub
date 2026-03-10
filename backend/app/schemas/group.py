"""Group schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class GroupCreate(BaseModel):
    season_id: UUID
    name: str
    division_id: Optional[UUID] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    division_id: Optional[UUID] = None
    deleted: Optional[bool] = None


class GroupResponse(BaseModel):
    id: UUID
    season_id: UUID
    name: str
    division_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True
