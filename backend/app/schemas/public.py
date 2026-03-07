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
    age_group: Optional[str] = None

    class Config:
        from_attributes = True


class PublicEditionResponse(BaseModel):
    id: UUID
    tournament_id: UUID
    tournament_name: str
    tournament_logo_url: Optional[str] = None
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
    home_team_name: Optional[str]
    home_team_logo_url: Optional[str] = None
    away_team_id: UUID
    away_team_name: Optional[str]
    away_team_logo_url: Optional[str] = None
    home_score: Optional[int]
    away_score: Optional[int]
    home_penalties: Optional[int]
    away_penalties: Optional[int]
    status: str

    class Config:
        from_attributes = True


class PublicMatchEventResponse(BaseModel):
    id: UUID
    team_id: UUID
    team_name: Optional[str] = None
    player_id: Optional[UUID]
    player_name: Optional[str] = None
    event_type: str
    minute: int

    class Config:
        from_attributes = True


class TopScorerResponse(BaseModel):
    player_id: UUID
    player_name: str
    team_id: UUID
    team_name: str
    goals: int


class DisciplineResponse(BaseModel):
    player_id: UUID
    player_name: str
    team_id: UUID
    team_name: str
    yellow_cards: int
    red_cards: int
    total: int
