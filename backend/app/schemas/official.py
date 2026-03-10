"""Official schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class OfficialCreate(BaseModel):
    organization_id: UUID
    name: str
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class OfficialUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    deleted: Optional[bool] = None


class OfficialResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    role: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MatchOfficialCreate(BaseModel):
    match_id: UUID
    official_id: UUID
    role: Optional[str] = None


class MatchOfficialResponse(BaseModel):
    id: UUID
    match_id: UUID
    official_id: UUID
    role: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
