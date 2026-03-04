"""Organiser schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class OrganiserCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    logo_url: Optional[str] = None


class OrganiserUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    logo_url: Optional[str] = None
    deleted: Optional[bool] = None


class OrganiserResponse(BaseModel):
    id: UUID
    owner_user_id: UUID
    name: str
    description: Optional[str]
    location: Optional[str]
    logo_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
