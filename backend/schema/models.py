"""
Multi-Tenant Football Tournament Platform - SQLAlchemy Models
Compatible with FastAPI and PostgreSQL
"""

import uuid
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
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
    PENALTIES = "penalties"
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
    SHOOTOUT_SCORED = "shootout_scored"
    SHOOTOUT_MISSED = "shootout_missed"


class PlayerPosition(str, PyEnum):
    GOALKEEPER = "goalkeeper"
    DEFENDER = "defender"
    MIDFIELDER = "midfielder"
    FORWARD = "forward"


class MembershipRole(str, PyEnum):
    PLATFORM_OWNER = "platform_owner"
    PLATFORM_ADMIN = "platform_admin"
    PLATFORM_SUPPORT = "platform_support"
    ORG_OWNER = "org_owner"
    ORG_ADMIN = "org_admin"
    COMPETITION_ADMIN = "competition_admin"
    FIXTURES_MANAGER = "fixtures_manager"
    REGISTRATIONS_MANAGER = "registrations_manager"
    STATS_MANAGER = "stats_manager"
    FINANCE_MANAGER = "finance_manager"
    MEDIA_MANAGER = "media_manager"
    CLUB_ADMIN = "club_admin"
    TEAM_MANAGER = "team_manager"
    COACH = "coach"
    MATCH_COMMISSIONER = "match_commissioner"
    REFEREE_CAPTURE_USER = "referee_capture_user"


class RegistrationStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class SurfaceType(str, PyEnum):
    GRASS = "grass"
    ARTIFICIAL = "artificial"
    FUTSAL = "futsal"
    SAND = "sand"
    OTHER = "other"


class AgeGroup(str, PyEnum):
    OPEN = "open"
    U9 = "u9"
    U11 = "u11"
    U13 = "u13"
    U15 = "u15"
    U17 = "u17"
    U19 = "u19"
    U21 = "u21"
    SENIOR = "senior"
    VETERANS = "veterans"
    WOMENS = "womens"
    GIRLS = "girls"


# =============================================================================
# USER MODEL
# =============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole, name="user_role", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.ORGANISER,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organizations = relationship(
        "Organization",
        back_populates="created_by",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    memberships = relationship(
        "Membership",
        foreign_keys="Membership.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    granted_memberships = relationship(
        "Membership",
        foreign_keys="Membership.granted_by",
        back_populates="grantor",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("email", name="users_email_unique"),
        Index("idx_users_email", "email", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


# =============================================================================
# ORGANIZATION MODEL
# =============================================================================

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=True)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    country = Column(String(100), nullable=False, default="South Africa")
    logo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    website_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    onboarded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    created_by = relationship("User", back_populates="organizations")
    memberships = relationship(
        "Membership",
        back_populates="organization",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    competitions = relationship(
        "Competition",
        back_populates="organization",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    venues = relationship(
        "Venue",
        back_populates="organization",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    clubs = relationship(
        "Club",
        back_populates="organization",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    media_posts = relationship(
        "MediaPost",
        back_populates="organization",
        passive_deletes=True,
    )
    officials = relationship(
        "Official",
        back_populates="organization",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("created_by_user_id", "name", name="organizations_name_per_owner_unique"),
        Index("idx_organizations_slug", "slug", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_organizations_country", "country", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name})>"


# =============================================================================
# MEMBERSHIP MODEL
# =============================================================================

class Membership(Base):
    __tablename__ = "memberships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
    )
    role = Column(
        Enum(MembershipRole, name="membership_role", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    scope_type = Column(String(50), nullable=True)
    scope_id = Column(UUID(as_uuid=True), nullable=True)
    granted_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    granted_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="memberships")
    grantor = relationship("User", foreign_keys=[granted_by], back_populates="granted_memberships")
    organization = relationship("Organization", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", "role", "scope_id", name="memberships_unique_role"),
        Index("idx_memberships_user_id", "user_id", postgresql_where=text("is_active = TRUE")),
        Index("idx_memberships_organization_id", "organization_id", postgresql_where=text("is_active = TRUE")),
    )

    def __repr__(self):
        return f"<Membership(id={self.id}, user_id={self.user_id}, role={self.role})>"


# =============================================================================
# COMPETITION MODEL
# =============================================================================

class Competition(Base):
    __tablename__ = "competitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    sport_type = Column(String(50), nullable=False, default="football")
    visibility = Column(String(20), nullable=False, default="public")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="competitions")
    seasons = relationship(
        "Season",
        back_populates="competition",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    media_posts = relationship(
        "MediaPost",
        back_populates="competition",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="competitions_name_per_org_unique"),
        Index("idx_competitions_organization_id", "organization_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_competitions_slug", "slug", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Competition(id={self.id}, name={self.name})>"


# =============================================================================
# SEASON MODEL
# =============================================================================

class Season(Base):
    __tablename__ = "seasons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("competitions.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=True)
    year = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    venue = Column(String(255), nullable=True)
    format = Column(
        Enum(EditionFormat, name="edition_format", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EditionFormat.GROUPS_KNOCKOUT,
    )
    status = Column(
        Enum(EditionStatus, name="edition_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EditionStatus.UPCOMING,
    )
    description = Column(Text, nullable=True)
    banner_url = Column(String(500), nullable=True)
    registration_deadline = Column(Date, nullable=True)
    max_teams = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    competition = relationship("Competition", back_populates="seasons")
    teams = relationship(
        "Team",
        back_populates="season",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    groups = relationship(
        "Group",
        back_populates="season",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    matches = relationship(
        "Match",
        back_populates="season",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    player_registrations = relationship(
        "PlayerRegistration",
        back_populates="season",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    divisions = relationship(
        "Division",
        back_populates="season",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    disciplinary_actions = relationship(
        "DisciplinaryAction",
        back_populates="season",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("competition_id", "year", name="seasons_year_per_competition_unique"),
        Index("idx_seasons_competition_id", "competition_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_seasons_status", "status", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Season(id={self.id}, name={self.name}, year={self.year})>"


# =============================================================================
# DIVISION MODEL
# =============================================================================

class Division(Base):
    __tablename__ = "divisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    season_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=True)
    age_group = Column(
        Enum(AgeGroup, name="age_group", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AgeGroup.OPEN,
    )
    format = Column(
        Enum(EditionFormat, name="edition_format", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EditionFormat.LEAGUE,
    )
    max_teams = Column(Integer, nullable=True)
    tier = Column(Integer, nullable=True, default=1)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    season = relationship("Season", back_populates="divisions")
    teams = relationship(
        "Team",
        back_populates="division",
        passive_deletes=True,
    )
    matches = relationship(
        "Match",
        back_populates="division",
        passive_deletes=True,
    )
    groups = relationship(
        "Group",
        back_populates="division",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("season_id", "name", name="divisions_name_per_season_unique"),
        Index("idx_divisions_season_id", "season_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_divisions_age_group", "age_group", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Division(id={self.id}, name={self.name}, age_group={self.age_group})>"


# =============================================================================
# VENUE MODEL
# =============================================================================

class Venue(Base):
    __tablename__ = "venues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    country = Column(String(100), nullable=False, default="South Africa")
    capacity = Column(Integer, nullable=True)
    surface_type = Column(
        Enum(SurfaceType, name="surface_type", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="venues")
    matches = relationship(
        "Match",
        back_populates="venue_rel",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("idx_venues_organization_id", "organization_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Venue(id={self.id}, name={self.name})>"


# =============================================================================
# CLUB MODEL
# =============================================================================

class Club(Base):
    __tablename__ = "clubs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=True)
    short_name = Column(String(50), nullable=True)
    logo_url = Column(String(500), nullable=True)
    home_venue = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    founded_year = Column(Integer, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_public = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="clubs")
    players = relationship(
        "Player",
        back_populates="club",
        passive_deletes=True,
    )
    teams = relationship(
        "Team",
        back_populates="club",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="clubs_name_per_org_unique"),
        Index("idx_clubs_organization_id", "organization_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Club(id={self.id}, name={self.name})>"


# =============================================================================
# TEAM MODEL
# =============================================================================

class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    season_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
    )
    club_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="SET NULL"),
        nullable=True,
    )
    division_id = Column(
        UUID(as_uuid=True),
        ForeignKey("divisions.id", ondelete="SET NULL"),
        nullable=True,
    )
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=True)
    short_name = Column(String(50), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_public = Column(Boolean, nullable=False, default=True)
    home_colors = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    season = relationship("Season", back_populates="teams")
    club = relationship("Club", back_populates="teams")
    division = relationship("Division", back_populates="teams")
    group_memberships = relationship(
        "GroupTeam",
        back_populates="team",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    player_registrations = relationship(
        "PlayerRegistration",
        back_populates="team",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    home_matches = relationship(
        "Match",
        foreign_keys="Match.home_team_id",
        back_populates="home_team",
        passive_deletes=True,
    )
    away_matches = relationship(
        "Match",
        foreign_keys="Match.away_team_id",
        back_populates="away_team",
        passive_deletes=True,
    )
    match_events = relationship(
        "MatchEvent",
        back_populates="team",
        passive_deletes=True,
    )
    lineups = relationship(
        "Lineup",
        back_populates="team",
        passive_deletes=True,
    )
    disciplinary_actions = relationship(
        "DisciplinaryAction",
        back_populates="team",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("season_id", "name", name="teams_name_per_season_unique"),
        Index("idx_teams_season_id", "season_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_teams_club_id", "club_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Team(id={self.id}, name={self.name})>"


# =============================================================================
# PLAYER MODEL
# =============================================================================

class Player(Base):
    __tablename__ = "players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="SET NULL"),
        nullable=True,
    )
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=True)
    jersey_number = Column(Integer, nullable=True)
    position = Column(
        Enum(PlayerPosition, name="player_position", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    date_of_birth = Column(Date, nullable=True)
    nationality = Column(String(100), nullable=True)
    profile_image = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    club = relationship("Club", back_populates="players")
    registrations = relationship(
        "PlayerRegistration",
        back_populates="player",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    match_events = relationship(
        "MatchEvent",
        back_populates="player",
        passive_deletes=True,
    )
    lineups = relationship(
        "Lineup",
        back_populates="player",
        passive_deletes=True,
    )
    disciplinary_actions = relationship(
        "DisciplinaryAction",
        back_populates="player",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("idx_players_club_id", "club_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_players_name", "name", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Player(id={self.id}, name={self.name})>"


# =============================================================================
# PLAYER REGISTRATION MODEL
# =============================================================================

class PlayerRegistration(Base):
    __tablename__ = "player_registrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    player_id = Column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    season_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
    )
    registration_number = Column(String(100), nullable=True)
    status = Column(
        Enum(RegistrationStatus, name="registration_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=RegistrationStatus.APPROVED,
    )
    jersey_number = Column(Integer, nullable=True)
    registered_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    player = relationship("Player", back_populates="registrations")
    team = relationship("Team", back_populates="player_registrations")
    season = relationship("Season", back_populates="player_registrations")

    __table_args__ = (
        UniqueConstraint("player_id", "season_id", name="player_reg_unique_per_season"),
        Index("idx_player_registrations_player_id", "player_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_player_registrations_team_id", "team_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_player_registrations_season_id", "season_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<PlayerRegistration(id={self.id}, player_id={self.player_id}, season_id={self.season_id})>"


# =============================================================================
# GROUP MODEL
# =============================================================================

class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    season_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
    )
    division_id = Column(
        UUID(as_uuid=True),
        ForeignKey("divisions.id", ondelete="SET NULL"),
        nullable=True,
    )
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    season = relationship("Season", back_populates="groups")
    division = relationship("Division", back_populates="groups")
    team_memberships = relationship(
        "GroupTeam",
        back_populates="group",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    matches = relationship(
        "Match",
        back_populates="group",
        passive_deletes=True,
    )

    __table_args__ = (
        UniqueConstraint("season_id", "name", name="groups_name_per_season_unique"),
        Index("idx_groups_season_id", "season_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Group(id={self.id}, name={self.name})>"


# =============================================================================
# GROUP TEAM MODEL (Junction Table)
# =============================================================================

class GroupTeam(Base):
    __tablename__ = "group_teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    group = relationship("Group", back_populates="team_memberships")
    team = relationship("Team", back_populates="group_memberships")

    __table_args__ = (
        UniqueConstraint("group_id", "team_id", name="group_teams_unique"),
    )

    def __repr__(self):
        return f"<GroupTeam(group_id={self.group_id}, team_id={self.team_id})>"


# =============================================================================
# MATCH MODEL
# =============================================================================

class Match(Base):
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    season_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
    )
    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="SET NULL"),
        nullable=True,
    )
    division_id = Column(
        UUID(as_uuid=True),
        ForeignKey("divisions.id", ondelete="SET NULL"),
        nullable=True,
    )
    venue_id = Column(
        UUID(as_uuid=True),
        ForeignKey("venues.id", ondelete="SET NULL"),
        nullable=True,
    )
    stage = Column(
        Enum(MatchStage, name="match_stage", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MatchStage.GROUP,
    )
    matchday = Column(Integer, nullable=True)
    kickoff_datetime = Column(DateTime(timezone=True), nullable=True)
    venue = Column(String(255), nullable=True)
    home_team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    away_team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    home_penalties = Column(Integer, nullable=True)
    away_penalties = Column(Integer, nullable=True)
    status = Column(
        Enum(MatchStatus, name="match_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MatchStatus.SCHEDULED,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    season = relationship("Season", back_populates="matches")
    group = relationship("Group", back_populates="matches")
    division = relationship("Division", back_populates="matches")
    venue_rel = relationship("Venue", back_populates="matches")
    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    events = relationship(
        "MatchEvent",
        back_populates="match",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    officials = relationship(
        "MatchOfficial",
        back_populates="match",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    lineups = relationship(
        "Lineup",
        back_populates="match",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    disciplinary_actions = relationship(
        "DisciplinaryAction",
        back_populates="match",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("idx_matches_season_id", "season_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_matches_status", "status", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Match(id={self.id}, stage={self.stage}, status={self.status})>"


# =============================================================================
# MATCH EVENT MODEL
# =============================================================================

class MatchEvent(Base):
    __tablename__ = "match_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(
        UUID(as_uuid=True),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    player_id = Column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type = Column(
        Enum(EventType, name="event_type", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    minute = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    match = relationship("Match", back_populates="events")
    team = relationship("Team", back_populates="match_events")
    player = relationship("Player", back_populates="match_events")

    __table_args__ = (
        Index("idx_match_events_match_id", "match_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_match_events_player_id", "player_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<MatchEvent(id={self.id}, type={self.event_type}, minute={self.minute})>"


# =============================================================================
# OFFICIAL MODEL
# =============================================================================

class Official(Base):
    __tablename__ = "officials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    role = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="officials")
    match_assignments = relationship(
        "MatchOfficial",
        back_populates="official",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("idx_officials_organization_id", "organization_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Official(id={self.id}, name={self.name}, role={self.role})>"


# =============================================================================
# MATCH OFFICIAL MODEL
# =============================================================================

class MatchOfficial(Base):
    __tablename__ = "match_officials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(
        UUID(as_uuid=True),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
    )
    official_id = Column(
        UUID(as_uuid=True),
        ForeignKey("officials.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    match = relationship("Match", back_populates="officials")
    official = relationship("Official", back_populates="match_assignments")

    __table_args__ = (
        UniqueConstraint("match_id", "official_id", name="match_officials_unique"),
    )

    def __repr__(self):
        return f"<MatchOfficial(match_id={self.match_id}, official_id={self.official_id})>"


# =============================================================================
# LINEUP MODEL
# =============================================================================

class Lineup(Base):
    __tablename__ = "lineups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(
        UUID(as_uuid=True),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    player_id = Column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="CASCADE"),
        nullable=False,
    )
    starting = Column(Boolean, nullable=False, default=True)
    jersey_number = Column(Integer, nullable=True)
    position = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    match = relationship("Match", back_populates="lineups")
    team = relationship("Team", back_populates="lineups")
    player = relationship("Player", back_populates="lineups")

    __table_args__ = (
        UniqueConstraint("match_id", "player_id", name="lineups_player_per_match_unique"),
        Index("idx_lineups_match_id", "match_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_lineups_team_id", "team_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<Lineup(match_id={self.match_id}, player_id={self.player_id}, starting={self.starting})>"


# =============================================================================
# DISCIPLINARY ACTION MODEL
# =============================================================================

class DisciplinaryAction(Base):
    __tablename__ = "disciplinary_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id = Column(
        UUID(as_uuid=True),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
    )
    player_id = Column(
        UUID(as_uuid=True),
        ForeignKey("players.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id = Column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    season_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seasons.id", ondelete="CASCADE"),
        nullable=False,
    )
    division_id = Column(
        UUID(as_uuid=True),
        ForeignKey("divisions.id", ondelete="CASCADE"),
        nullable=True,
    )
    action_type = Column(String(50), nullable=False)
    minute = Column(Integer, nullable=True)
    reason = Column(Text, nullable=True)
    suspension_matches = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    match = relationship("Match", back_populates="disciplinary_actions")
    player = relationship("Player", back_populates="disciplinary_actions")
    team = relationship("Team", back_populates="disciplinary_actions")
    season = relationship("Season", back_populates="disciplinary_actions")

    __table_args__ = (
        Index("idx_disciplinary_player_id", "player_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_disciplinary_match_id", "match_id", postgresql_where=text("deleted_at IS NULL")),
        Index("idx_disciplinary_season_id", "season_id", postgresql_where=text("deleted_at IS NULL")),
    )

    def __repr__(self):
        return f"<DisciplinaryAction(id={self.id}, player_id={self.player_id}, action_type={self.action_type})>"


# =============================================================================
# MEDIA POST MODEL
# =============================================================================

class MediaPost(Base):
    __tablename__ = "media_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
    )
    competition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("competitions.id", ondelete="CASCADE"),
        nullable=True,
    )
    title = Column(String(255), nullable=True)
    body = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="media_posts")
    competition = relationship("Competition", back_populates="media_posts")

    def __repr__(self):
        return f"<MediaPost(id={self.id}, title={self.title})>"
