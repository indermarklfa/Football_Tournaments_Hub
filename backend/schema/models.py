"""
PitchBase Football Platform — SQLAlchemy Models
Rebuilt schema: multi-tenant, player-centric, division-based.
"""

import uuid
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


# =============================================================================
# ENUM DEFINITIONS
# =============================================================================

class FormatType(str, PyEnum):
    LEAGUE = "league"
    GROUPS_KNOCKOUT = "groups_knockout"
    KNOCKOUT = "knockout"


class TransferType(str, PyEnum):
    NEW_REGISTRATION = "new_registration"
    TRANSFER = "transfer"
    LOAN = "loan"
    RETURN_FROM_LOAN = "return_from_loan"


class PlayerPosition(str, PyEnum):
    GOALKEEPER = "goalkeeper"
    DEFENDER = "defender"
    MIDFIELDER = "midfielder"
    FORWARD = "forward"


class MatchStatus(str, PyEnum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    PENALTIES  = "penalties"
    COMPLETED = "completed"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"


class EventType(str, PyEnum):
    GOAL = "goal"
    OWN_GOAL = "own_goal"
    YELLOW_CARD = "yellow_card"
    RED_CARD = "red_card"
    YELLOW_RED_CARD = "yellow_red_card"
    SUB_ON = "sub_on"
    SUB_OFF = "sub_off"
    PENALTY_SCORED = "penalty_scored"
    PENALTY_MISSED = "penalty_missed"
    ASSIST = "assist"
    PENALTY_SHOOTOUT_SCORED = "penalty_shootout_scored"
    PENALTY_SHOOTOUT_MISSED = "penalty_shootout_missed"


class UserRole(str, PyEnum):
    ADMIN = "admin"
    ORGANISER = "organiser"


class StructureType(str, PyEnum):
    NATIONAL = "national"
    PROVINCE = "province"
    REGION = "region"
    LFA = "lfa"
    STREAM = "stream"


# =============================================================================
# AUTH
# =============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="user_role", values_callable=lambda x: [e.value for e in x]), nullable=False, default=UserRole.ORGANISER)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    organizations = relationship("Organization", back_populates="owner")
    memberships = relationship("Membership", back_populates="user")


# =============================================================================
# LAYER 1 — PERSISTENT ENTITIES
# =============================================================================

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    short_name = Column(String(100))
    organization_type = Column(String(100))
    parent_organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    parent = relationship("Organization", remote_side="Organization.id", foreign_keys=[parent_organization_id])
    owner = relationship("User", back_populates="organizations")
    competitions = relationship("Competition", back_populates="organization")
    clubs = relationship("Club", back_populates="organization")
    media_posts = relationship("MediaPost", back_populates="organization")


class FootballStructure(Base):
    __tablename__ = "football_structures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    structure_code = Column(String(50), nullable=False, unique=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("football_structures.id"), nullable=True)
    name = Column(String(255), nullable=False)
    short_name = Column(String(50))
    structure_type = Column(Enum(StructureType, name="structure_type", values_callable=lambda x: [e.value for e in x]), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    parent = relationship("FootballStructure", remote_side="FootballStructure.id", foreign_keys=[parent_id])
    organization = relationship("Organization")


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="memberships_user_org_unique"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization")


class Venue(Base):
    __tablename__ = "venues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    location = Column(String(255))
    address = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    clubs = relationship("Club", back_populates="home_venue")
    matches = relationship("Match", back_populates="venue")


class Competition(Base):
    __tablename__ = "competitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    competition_type = Column(String(100))
    scope_level = Column(String(100))
    host_structure_id = Column(UUID(as_uuid=True), ForeignKey("football_structures.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    organization = relationship("Organization", back_populates="competitions")
    seasons = relationship("Season", back_populates="competition")


class Season(Base):
    __tablename__ = "seasons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competition_id = Column(UUID(as_uuid=True), ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(50), nullable=False, default="upcoming")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    competition = relationship("Competition", back_populates="seasons")
    divisions = relationship("Division", back_populates="season")


class Division(Base):
    __tablename__ = "divisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    season_id = Column(UUID(as_uuid=True), ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    age_group = Column(String(100))
    gender = Column(String(50))
    format_type = Column(Enum(FormatType, name="format_type", values_callable=lambda x: [e.value for e in x]), nullable=False, default=FormatType.LEAGUE)
    min_birthdate = Column(Date)
    max_birthdate = Column(Date)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    season = relationship("Season", back_populates="divisions")
    teams = relationship("Team", back_populates="division")
    groups = relationship("Group", back_populates="division")
    matches = relationship("Match", back_populates="division")


class Club(Base):
    __tablename__ = "clubs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    short_name = Column(String(100))
    home_venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="SET NULL"), nullable=True)
    home_structure_id = Column(UUID(as_uuid=True), ForeignKey("football_structures.id", ondelete="SET NULL"), nullable=True)
    logo_url = Column(String(500))
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    organization = relationship("Organization", back_populates="clubs")
    home_venue = relationship("Venue", back_populates="clubs")
    teams = relationship("Team", back_populates="club")
    player_memberships = relationship("ClubPlayerMembership", back_populates="club")


class Player(Base):
    __tablename__ = "players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    date_of_birth = Column(Date)
    gender = Column(String(50))
    nationality = Column(String(100))
    id_number = Column(String(100))
    primary_position = Column(Enum(PlayerPosition, name="player_position", values_callable=lambda x: [e.value for e in x]))
    secondary_position = Column(Enum(PlayerPosition, name="player_position", values_callable=lambda x: [e.value for e in x]))
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    club_memberships = relationship("ClubPlayerMembership", back_populates="player")
    registrations = relationship("PlayerRegistration", back_populates="player")
    match_lineups = relationship("MatchLineup", back_populates="player")
    match_events = relationship(
        "MatchEvent", back_populates="player", foreign_keys="MatchEvent.player_id"
    )
    related_match_events = relationship(
        "MatchEvent", back_populates="related_player", foreign_keys="MatchEvent.related_player_id"
    )


# =============================================================================
# LAYER 2 — PLAYER/CLUB RELATIONSHIPS
# =============================================================================

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    from_club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="SET NULL"), nullable=True)
    to_club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    transfer_type = Column(Enum(TransferType, name="transfer_type", values_callable=lambda x: [e.value for e in x]), nullable=False)
    effective_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    player = relationship("Player")
    from_club = relationship("Club", foreign_keys=[from_club_id])
    to_club = relationship("Club", foreign_keys=[to_club_id])
    resulting_memberships = relationship("ClubPlayerMembership", back_populates="source_transfer")


class ClubPlayerMembership(Base):
    __tablename__ = "club_player_memberships"
    __table_args__ = (
        UniqueConstraint("player_id", "club_id", "start_date", name="uq_membership_player_club_start"),
        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="ck_membership_dates_valid",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(String(50), nullable=False, default="active")
    source_transfer_id = Column(UUID(as_uuid=True), ForeignKey("transfers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    player = relationship("Player", back_populates="club_memberships")
    club = relationship("Club", back_populates="player_memberships")
    source_transfer = relationship("Transfer", back_populates="resulting_memberships")
    registrations = relationship("PlayerRegistration", back_populates="membership")


# =============================================================================
# LAYER 3 — COMPETITION PARTICIPATION
# =============================================================================

class Team(Base):
    __tablename__ = "teams"
    __table_args__ = (
        UniqueConstraint("club_id", "division_id", name="uq_team_club_division"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    division_id = Column(UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False)
    display_name = Column(String(255), nullable=False)
    age_group_snapshot = Column(String(100), nullable=True)
    gender_snapshot = Column(String(50), nullable=True)
    division_name_snapshot = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    club = relationship("Club", back_populates="teams")
    division = relationship("Division", back_populates="teams")
    registrations = relationship("PlayerRegistration", back_populates="team")
    group_memberships = relationship("GroupTeam", back_populates="team")
    home_matches = relationship("Match", back_populates="home_team", foreign_keys="Match.home_team_id")
    away_matches = relationship("Match", back_populates="away_team", foreign_keys="Match.away_team_id")
    match_lineups = relationship("MatchLineup", back_populates="team")
    match_events = relationship("MatchEvent", back_populates="team")


class PlayerRegistration(Base):
    __tablename__ = "player_registrations"
    __table_args__ = (
        UniqueConstraint("player_id", "team_id", name="uq_registration_player_team"),
        CheckConstraint(
            "deregistered_on IS NULL OR registered_on IS NULL OR deregistered_on >= registered_on",
            name="ck_registration_dates_valid",
        ),
        CheckConstraint(
            "squad_number IS NULL OR (squad_number >= 1 AND squad_number <= 99)",
            name="ck_registration_squad_number_range",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    membership_id = Column(UUID(as_uuid=True), ForeignKey("club_player_memberships.id", ondelete="SET NULL"), nullable=True)
    registration_type = Column(String(100))
    status = Column(String(50), nullable=False, default="pending")
    registered_on = Column(Date)
    deregistered_on = Column(Date)
    squad_number = Column(Integer)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    player = relationship("Player", back_populates="registrations")
    team = relationship("Team", back_populates="registrations")
    membership = relationship("ClubPlayerMembership", back_populates="registrations")
    match_lineups = relationship("MatchLineup", back_populates="registration")
    match_events = relationship("MatchEvent", back_populates="registration")


class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    division_id = Column(UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    division = relationship("Division", back_populates="groups")
    teams = relationship("GroupTeam", back_populates="group")
    matches = relationship("Match", back_populates="group")


class GroupTeam(Base):
    __tablename__ = "group_teams"
    __table_args__ = (
        UniqueConstraint("group_id", "team_id", name="uq_group_team"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)

    group = relationship("Group", back_populates="teams")
    team = relationship("Team", back_populates="group_memberships")


# =============================================================================
# LAYER 4 — MATCH OPERATIONS
# =============================================================================

class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        CheckConstraint("home_team_id != away_team_id", name="ck_match_different_teams"),
        CheckConstraint(
            "(home_score IS NULL OR home_score >= 0) AND (away_score IS NULL OR away_score >= 0)",
            name="ck_match_scores_non_negative",
        ),
        CheckConstraint("home_penalties IS NULL OR home_penalties >= 0", name="ck_match_home_penalties_non_negative"),
        CheckConstraint("away_penalties IS NULL OR away_penalties >= 0", name="ck_match_away_penalties_non_negative"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    division_id = Column(UUID(as_uuid=True), ForeignKey("divisions.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=True)
    home_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    away_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="SET NULL"), nullable=True)
    round_no = Column(Integer)
    matchday = Column(Integer)
    kickoff_at = Column(DateTime(timezone=True))
    status = Column(Enum(MatchStatus, name="match_status", values_callable=lambda x: [e.value for e in x]), nullable=False, default=MatchStatus.SCHEDULED)
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))
    home_penalties = Column(Integer)
    away_penalties = Column(Integer)
    shootout_first_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"))

    division = relationship("Division", back_populates="matches")
    group = relationship("Group", back_populates="matches")
    home_team = relationship("Team", back_populates="home_matches", foreign_keys=[home_team_id])
    away_team = relationship("Team", back_populates="away_matches", foreign_keys=[away_team_id])
    venue = relationship("Venue", back_populates="matches")
    lineups = relationship("MatchLineup", back_populates="match")
    events = relationship("MatchEvent", back_populates="match")


class MatchLineup(Base):
    __tablename__ = "match_lineups"
    __table_args__ = (
        UniqueConstraint("match_id", "team_id", "player_id", name="uq_lineup_match_team_player"),
        CheckConstraint(
            "shirt_number IS NULL OR (shirt_number >= 1 AND shirt_number <= 99)",
            name="ck_lineup_shirt_number_range",
        ),
        CheckConstraint(
            "minute_on IS NULL OR (minute_on >= 0 AND minute_on <= 130)",
            name="ck_lineup_minute_on_range",
        ),
        CheckConstraint(
            "minute_off IS NULL OR (minute_off >= 0 AND minute_off <= 130)",
            name="ck_lineup_minute_off_range",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    registration_id = Column(UUID(as_uuid=True), ForeignKey("player_registrations.id", ondelete="SET NULL"), nullable=True)
    is_starting = Column(Boolean, nullable=False, default=True)
    bench_order = Column(Integer)
    shirt_number = Column(Integer)
    position_code = Column(String(20))
    is_captain = Column(Boolean, nullable=False, default=False)
    minute_on = Column(Integer)
    minute_off = Column(Integer)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    match = relationship("Match", back_populates="lineups")
    team = relationship("Team", back_populates="match_lineups")
    player = relationship("Player", back_populates="match_lineups")
    registration = relationship("PlayerRegistration", back_populates="match_lineups")


class MatchEvent(Base):
    __tablename__ = "match_events"
    __table_args__ = (
        CheckConstraint(
            "minute IS NULL OR (minute >= 0 AND minute <= 130)",
            name="ck_event_minute_range",
        ),
        CheckConstraint(
            "extra_minute IS NULL OR (extra_minute >= 0 AND extra_minute <= 30)",
            name="ck_event_extra_minute_range",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="SET NULL"), nullable=True)
    related_player_id = Column(UUID(as_uuid=True), ForeignKey("players.id", ondelete="SET NULL"), nullable=True)
    registration_id = Column(UUID(as_uuid=True), ForeignKey("player_registrations.id", ondelete="SET NULL"), nullable=True)
    minute = Column(Integer)
    extra_minute = Column(Integer)
    event_type = Column(Enum(EventType, name="event_type", values_callable=lambda x: [e.value for e in x]), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    match = relationship("Match", back_populates="events")
    team = relationship("Team", back_populates="match_events")
    player = relationship("Player", back_populates="match_events", foreign_keys=[player_id])
    related_player = relationship("Player", back_populates="related_match_events", foreign_keys=[related_player_id])
    registration = relationship("PlayerRegistration", back_populates="match_events")


# =============================================================================
# LAYER 5 — CONTENT
# =============================================================================

class MediaPost(Base):
    __tablename__ = "media_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255))
    body = Column(Text)
    media_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    organization = relationship("Organization", back_populates="media_posts")
