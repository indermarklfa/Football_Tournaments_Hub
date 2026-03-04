"""Public response schemas"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List


class PublicTournamentResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    logo_url: Optional[str]
    organiser_name: Optional[str] = None
    organiser_location: Optional[str] = None

    class Config:
        from_attributes = True


class PublicEditionResponse(BaseModel):
    id: UUID
    tournament_id: UUID
    tournament_name: Optional[str] = None
    name: str
    year: int
    start_date: Optional[date]
    end_date: Optional[date]
    venue: Optional[str]
    format: str
    status: str

    class Config:
        from_attributes = True


class PublicTeamResponse(BaseModel):
    id: UUID
    name: str
    logo_url: Optional[str]
    coach_name: Optional[str]

    class Config:
        from_attributes = True


class PublicFixtureResponse(BaseModel):
    id: UUID
    stage: str
    matchday: Optional[int]
    kickoff_datetime: Optional[datetime]
    venue: Optional[str]
    home_team_id: UUID
    home_team_name: Optional[str] = None
    away_team_id: UUID
    away_team_name: Optional[str] = None
    home_score: Optional[int]
    away_score: Optional[int]
    status: str

    class Config:
        from_attributes = True
