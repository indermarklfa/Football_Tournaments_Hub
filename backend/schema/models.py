"""
Multi-Tenant Football Tournament Platform - SQLAlchemy Models
Compatible with FastAPI and PostgreSQL
"""

import uuid
from datetime import date, datetime
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


# =============================================================================
# ENUM DEFINITIONS
# =============================================================================

class UserRole(str, PyEnum):
    ADMIN = "admin"
    ORGANISER = "organiser"


class EditionFormat(str, PyEnum):
    KNOCKOUT = "knockout"
    GROUPS_KNOCKOUT = "groups_knockout"
    LEAGUE = "league"


class EditionStatus(str, PyEnum):
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"


class MatchStage(str, PyEnum):
    GROUP = "group"
    ROUND_OF_16 = "round_of_16"
    QUARTERFINAL = "quarterfinal"
    SEMIFINAL = "semifinal"
    THIRD_PLACE = "third_place"
    FINAL = "final"


class MatchStatus(str, PyEnum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    COMPLETED = "completed"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"


class EventType(str, PyEnum):
    GOAL = "goal"
    YELLOW_CARD = "yellow_card"
    RED_CARD = "red_card"
    OWN_GOAL = "own_goal"
    SUBSTITUTION = "substitution"
    PENALTY_SCORED = "penalty_scored"
    PENALTY_MISSED = "penalty_missed"


class PlayerPosition(str, PyEnum):
    GOALKEEPER = "goalkeeper"
    DEFENDER = "defender"
    MIDFIELDER = "midfielder"
    FORWARD = "forward"


# =============================================================================
# USER MODEL
# =============================================================================

class User(Base):
    """Platform users who manage tournaments"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole, name="user_role", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.ORGANISER
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organisers = relationship(
        "Organiser",
        back_populates="owner",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    __table_args__ = (
        Index("idx_users_email", "email", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_users_role", "role", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


# =============================================================================
# ORGANISER MODEL
# =============================================================================

class Organiser(Base):
    """Entity that hosts tournaments"""
    __tablename__ = "organisers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="organisers")
    tournaments = relationship(
        "Tournament",
        back_populates="organiser",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("owner_user_id", "name", name="organisers_name_per_owner_unique"),
        Index("idx_organisers_owner_user_id", "owner_user_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_organisers_name", "name", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Organiser(id={self.id}, name={self.name})>"


# =============================================================================
# TOURNAMENT MODEL
# =============================================================================

class Tournament(Base):
    """Represents the tournament brand (e.g. 'Blouberg Easter Tournament')"""
    __tablename__ = "tournaments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organiser_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organisers.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    age_group = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organiser = relationship("Organiser", back_populates="tournaments")
    editions = relationship(
        "Edition",
        back_populates="tournament",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("organiser_id", "name", name="tournaments_name_per_organiser_unique"),
        Index("idx_tournaments_organiser_id", "organiser_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_tournaments_name", "name", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Tournament(id={self.id}, name={self.name})>"


# =============================================================================
# EDITION MODEL
# =============================================================================

class Edition(Base):
    """Represents a specific yearly event (e.g. 'Blouberg Easter Tournament 2026')"""
    __tablename__ = "editions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tournaments.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(255), nullable=False)
    year = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    venue = Column(String(255), nullable=True)
    format = Column(
        Enum(EditionFormat, name="edition_format", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EditionFormat.GROUPS_KNOCKOUT
    )
    status = Column(
        Enum(EditionStatus, name="edition_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EditionStatus.UPCOMING
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    tournament = relationship("Tournament", back_populates="editions")
    teams = relationship(
        "Team",
        back_populates="edition",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    groups = relationship(
        "Group",
        back_populates="edition",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    matches = relationship(
        "Match",
        back_populates="edition",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    media_posts = relationship(
        "MediaPost",
        back_populates="edition",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("tournament_id", "year", name="editions_year_per_tournament_unique"),
        Index("idx_editions_tournament_id", "tournament_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_editions_status", "status", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_editions_year", "year", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_editions_start_date", "start_date", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Edition(id={self.id}, name={self.name}, year={self.year})>"


# =============================================================================
# TEAM MODEL
# =============================================================================

class Team(Base):
    """Teams participating in an edition"""
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    edition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("editions.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    coach_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    edition = relationship("Edition", back_populates="teams")
    players = relationship(
        "Player",
        back_populates="team",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    group_memberships = relationship(
        "GroupTeam",
        back_populates="team",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    home_matches = relationship(
        "Match",
        foreign_keys="Match.home_team_id",
        back_populates="home_team",
        passive_deletes=True
    )
    away_matches = relationship(
        "Match",
        foreign_keys="Match.away_team_id",
        back_populates="away_team",
        passive_deletes=True
    )
    match_events = relationship(
        "MatchEvent",
        back_populates="team",
        passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("edition_id", "name", name="teams_name_per_edition_unique"),
        Index("idx_teams_edition_id", "edition_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_teams_name", "name", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Team(id={self.id}, name={self.name})>"


# =============================================================================
# PLAYER MODEL
# =============================================================================

class Player(Base):
    """Players belonging to a team"""
    __tablename__ = "players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(255), nullable=False)
    jersey_number = Column(Integer, nullable=True)
    position = Column(
        Enum(PlayerPosition, name="player_position", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    date_of_birth = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    team = relationship("Team", back_populates="players")
    match_events = relationship(
        "MatchEvent",
        back_populates="player",
        passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("team_id", "jersey_number", name="players_jersey_per_team_unique"),
        Index("idx_players_team_id", "team_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_players_name", "name", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Player(id={self.id}, name={self.name}, jersey={self.jersey_number})>"


# =============================================================================
# GROUP MODEL
# =============================================================================

class Group(Base):
    """Groups for group stage tournaments"""
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    edition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("editions.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    edition = relationship("Edition", back_populates="groups")
    team_memberships = relationship(
        "GroupTeam",
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    matches = relationship(
        "Match",
        back_populates="group",
        passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("edition_id", "name", name="groups_name_per_edition_unique"),
        Index("idx_groups_edition_id", "edition_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Group(id={self.id}, name={self.name})>"


# =============================================================================
# GROUP TEAM MEMBERSHIP MODEL (Junction Table)
# =============================================================================

class GroupTeam(Base):
    """Many-to-many relationship between groups and teams"""
    __tablename__ = "group_teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    group = relationship("Group", back_populates="team_memberships")
    team = relationship("Team", back_populates="group_memberships")

    __table_args__ = (
        UniqueConstraint("group_id", "team_id", name="group_teams_unique"),
        Index("idx_group_teams_group_id", "group_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_group_teams_team_id", "team_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<GroupTeam(group_id={self.group_id}, team_id={self.team_id})>"


# =============================================================================
# MATCH MODEL
# =============================================================================

class Match(Base):
    """Matches within an edition"""
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    edition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("editions.id", ondelete="CASCADE"),
        nullable=False
    )
    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="SET NULL"),
        nullable=True
    )
    stage = Column(
        Enum(MatchStage, name="match_stage", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MatchStage.GROUP
    )
    matchday = Column(Integer, nullable=True)
    kickoff_datetime = Column(DateTime(timezone=True), nullable=True)
    venue = Column(String(255), nullable=True)
    home_team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False
    )
    away_team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False
    )
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    status = Column(
        Enum(MatchStatus, name="match_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MatchStatus.SCHEDULED
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    edition = relationship("Edition", back_populates="matches")
    group = relationship("Group", back_populates="matches")
    home_team = relationship(
        "Team",
        foreign_keys=[home_team_id],
        back_populates="home_matches"
    )
    away_team = relationship(
        "Team",
        foreign_keys=[away_team_id],
        back_populates="away_matches"
    )
    events = relationship(
        "MatchEvent",
        back_populates="match",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    __table_args__ = (
        CheckConstraint("home_team_id != away_team_id", name="matches_different_teams"),
        Index("idx_matches_edition_id", "edition_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_matches_group_id", "group_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_matches_home_team_id", "home_team_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_matches_away_team_id", "away_team_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_matches_kickoff_datetime", "kickoff_datetime", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_matches_status", "status", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_matches_stage", "stage", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Match(id={self.id}, stage={self.stage}, status={self.status})>"


# =============================================================================
# MATCH EVENT MODEL
# =============================================================================

class MatchEvent(Base):
    """Events that occur during a match (goals, cards, substitutions)"""
    __tablename__ = "match_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(
        UUID(as_uuid=True),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False
    )
    player_id = Column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="SET NULL"),
        nullable=True
    )
    event_type = Column(
        Enum(EventType, name="event_type", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    minute = Column(Integer, nullable=False)
    additional_info = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    match = relationship("Match", back_populates="events")
    team = relationship("Team", back_populates="match_events")
    player = relationship("Player", back_populates="match_events")

    __table_args__ = (
        CheckConstraint("minute >= 0 AND minute <= 150", name="match_events_minute_check"),
        Index("idx_match_events_match_id", "match_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_match_events_team_id", "team_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_match_events_player_id", "player_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_match_events_event_type", "event_type", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<MatchEvent(id={self.id}, type={self.event_type}, minute={self.minute})>"


# =============================================================================
# MEDIA POST MODEL
# =============================================================================

class MediaPost(Base):
    """Media posts for tournament announcements and images"""
    __tablename__ = "media_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    edition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("editions.id", ondelete="CASCADE"),
        nullable=False
    )
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    edition = relationship("Edition", back_populates="media_posts")

    __table_args__ = (
        Index("idx_media_posts_edition_id", "edition_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_media_posts_created_at", "created_at", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<MediaPost(id={self.id}, title={self.title})>"
