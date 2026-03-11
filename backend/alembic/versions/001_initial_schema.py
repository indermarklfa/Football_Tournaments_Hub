"""Initial schema — full rebuild

Revision ID: 001
Revises:
Create Date: 2026-03-10
"""
from alembic import op

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_OLD_TABLES = [
    # leaf → root order so plain DROP (no CASCADE needed) would work,
    # but we use CASCADE anyway for safety
    "match_officials",
    "disciplinary_actions",
    "lineups",
    "match_events",
    "group_teams",
    "player_registrations",
    "matches",
    "groups",
    "teams",
    "officials",
    "players",
    "clubs",
    "memberships",
    "football_structures",
    "divisions",
    "seasons",
    "competitions",
    "media_posts",
    "venues",
    "organizations",
    "users",
]

_OLD_ENUMS = [
    "user_role",
    "edition_format",
    "edition_status",
    "match_stage",
    "match_status",
    "event_type",
    "player_position",
    "membership_role",
    "registration_status",
    "surface_type",
    "age_group",
    # new enum names (idempotent — IF EXISTS prevents errors on fresh DB)
    "format_type",
    "transfer_type",
    "structure_type",
]


def upgrade():
    # ── 0. Extensions ──────────────────────────────────────────────────────
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # ── 1. Drop old tables ─────────────────────────────────────────────────
    for tbl in _OLD_TABLES:
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE")

    # ── 2. Drop old (and any pre-existing new) enum types ─────────────────
    for enum in _OLD_ENUMS:
        op.execute(f"DROP TYPE IF EXISTS {enum} CASCADE")

    # ── 3. Create new enum types ───────────────────────────────────────────
    op.execute("CREATE TYPE user_role     AS ENUM ('admin', 'organiser')")
    op.execute("CREATE TYPE structure_type AS ENUM ('national', 'province', 'region', 'lfa', 'stream')")
    op.execute("CREATE TYPE format_type   AS ENUM ('league', 'groups_knockout', 'knockout')")
    op.execute("CREATE TYPE transfer_type AS ENUM ('new_registration', 'transfer', 'loan', 'return_from_loan')")
    op.execute("CREATE TYPE player_position AS ENUM ('goalkeeper', 'defender', 'midfielder', 'forward')")
    op.execute("CREATE TYPE match_status  AS ENUM ('scheduled', 'live', 'completed', 'postponed', 'cancelled')")
    op.execute("""
        CREATE TYPE event_type AS ENUM (
            'goal', 'own_goal', 'yellow_card', 'red_card', 'yellow_red_card',
            'sub_on', 'sub_off', 'penalty_scored', 'penalty_missed'
        )
    """)

    # ── 4. Create tables in dependency order ───────────────────────────────

    # users (no FK dependencies)
    op.execute("""
        CREATE TABLE users (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email         VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role          user_role NOT NULL DEFAULT 'organiser',
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at    TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL")

    # organizations (self-referential FK; depends on users for owner_user_id)
    op.execute("""
        CREATE TABLE organizations (
            id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name                   VARCHAR(255) NOT NULL,
            short_name             VARCHAR(100),
            organization_type      VARCHAR(100),
            parent_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
            owner_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
            status                 VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at             TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_organizations_status ON organizations(status) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_organizations_parent ON organizations(parent_organization_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_organizations_owner ON organizations(owner_user_id) WHERE deleted_at IS NULL")

    # football_structures (depends on organizations; self-referential)
    op.execute("""
        CREATE TABLE football_structures (
            id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            structure_code VARCHAR(50) NOT NULL UNIQUE,
            parent_id      UUID REFERENCES football_structures(id),
            name           VARCHAR(255) NOT NULL,
            short_name     VARCHAR(50),
            structure_type structure_type NOT NULL,
            organization_id UUID REFERENCES organizations(id),
            status         VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX idx_football_structures_parent_id ON football_structures(parent_id)")
    op.execute("CREATE INDEX idx_football_structures_type ON football_structures(structure_type)")
    op.execute("CREATE INDEX idx_football_structures_status ON football_structures(status)")

    # memberships (depends on users + organizations)
    op.execute("""
        CREATE TABLE memberships (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            role            VARCHAR(50) NOT NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at      TIMESTAMPTZ,
            CONSTRAINT memberships_user_org_unique UNIQUE (user_id, organization_id)
        )
    """)
    op.execute("CREATE INDEX idx_memberships_user_id ON memberships(user_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_memberships_org_id ON memberships(organization_id) WHERE deleted_at IS NULL")

    # venues
    op.execute("""
        CREATE TABLE venues (
            id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name       VARCHAR(255) NOT NULL,
            location   VARCHAR(255),
            address    TEXT,
            latitude   DOUBLE PRECISION,
            longitude  DOUBLE PRECISION,
            status     VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_venues_status ON venues(status) WHERE deleted_at IS NULL")

    # competitions
    op.execute("""
        CREATE TABLE competitions (
            id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name              VARCHAR(255) NOT NULL,
            competition_type  VARCHAR(100),
            scope_level       VARCHAR(100),
            host_structure_id UUID REFERENCES football_structures(id) ON DELETE SET NULL,
            status            VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at        TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_competitions_organization_id ON competitions(organization_id) WHERE deleted_at IS NULL")

    # seasons
    op.execute("""
        CREATE TABLE seasons (
            id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
            name           VARCHAR(255) NOT NULL,
            start_date     DATE,
            end_date       DATE,
            status         VARCHAR(50) NOT NULL DEFAULT 'upcoming',
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at     TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_seasons_competition_id ON seasons(competition_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_seasons_status ON seasons(status) WHERE deleted_at IS NULL")

    # divisions
    op.execute("""
        CREATE TABLE divisions (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            season_id     UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
            name          VARCHAR(255) NOT NULL,
            age_group     VARCHAR(100),
            gender        VARCHAR(50),
            format_type   format_type NOT NULL DEFAULT 'league',
            min_birthdate DATE,
            max_birthdate DATE,
            status        VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at    TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_divisions_season_id ON divisions(season_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_divisions_status ON divisions(status) WHERE deleted_at IS NULL")

    # clubs (depends on organizations + venues)
    op.execute("""
        CREATE TABLE clubs (
            id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name               VARCHAR(255) NOT NULL,
            short_name         VARCHAR(100),
            home_venue_id      UUID REFERENCES venues(id) ON DELETE SET NULL,
            home_structure_id  UUID REFERENCES football_structures(id) ON DELETE SET NULL,
            logo_url           VARCHAR(500),
            status             VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at         TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_clubs_organization_id ON clubs(organization_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_clubs_status ON clubs(status) WHERE deleted_at IS NULL")

    # players (global entities — no club or team FK)
    op.execute("""
        CREATE TABLE players (
            id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            first_name         VARCHAR(255) NOT NULL,
            last_name          VARCHAR(255) NOT NULL,
            date_of_birth      DATE,
            gender             VARCHAR(50),
            nationality        VARCHAR(100),
            id_number          VARCHAR(100),
            primary_position   player_position,
            secondary_position player_position,
            status             VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at         TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_players_last_name ON players(last_name) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_players_status ON players(status) WHERE deleted_at IS NULL")

    # transfers (depends on players + clubs)
    op.execute("""
        CREATE TABLE transfers (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            from_club_id  UUID REFERENCES clubs(id) ON DELETE SET NULL,
            to_club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
            transfer_type transfer_type NOT NULL,
            effective_date DATE NOT NULL,
            status        VARCHAR(50) NOT NULL DEFAULT 'pending',
            notes         TEXT,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX idx_transfers_player_id ON transfers(player_id)")
    op.execute("CREATE INDEX idx_transfers_to_club_id ON transfers(to_club_id)")
    op.execute("CREATE INDEX idx_transfers_effective_date ON transfers(effective_date)")

    # club_player_memberships (depends on players + clubs + transfers)
    op.execute("""
        CREATE TABLE club_player_memberships (
            id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            player_id          UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            club_id            UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
            start_date         DATE NOT NULL,
            end_date           DATE,
            status             VARCHAR(50) NOT NULL DEFAULT 'active',
            source_transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
            created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_membership_player_club_start UNIQUE (player_id, club_id, start_date)
        )
    """)
    op.execute("CREATE INDEX idx_memberships_player_id ON club_player_memberships(player_id)")
    op.execute("CREATE INDEX idx_memberships_club_id ON club_player_memberships(club_id)")
    op.execute("CREATE INDEX idx_memberships_status ON club_player_memberships(status)")

    # teams (depends on clubs + divisions)
    op.execute("""
        CREATE TABLE teams (
            id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
            division_id  UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
            display_name VARCHAR(255) NOT NULL,
            status       VARCHAR(50) NOT NULL DEFAULT 'active',
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at   TIMESTAMPTZ,
            CONSTRAINT uq_team_club_division UNIQUE (club_id, division_id)
        )
    """)
    op.execute("CREATE INDEX idx_teams_division_id ON teams(division_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_teams_club_id ON teams(club_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_teams_status ON teams(status) WHERE deleted_at IS NULL")

    # player_registrations (depends on players + teams + club_player_memberships)
    op.execute("""
        CREATE TABLE player_registrations (
            id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            player_id         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            team_id           UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            membership_id     UUID REFERENCES club_player_memberships(id) ON DELETE SET NULL,
            registration_type VARCHAR(100),
            status            VARCHAR(50) NOT NULL DEFAULT 'pending',
            registered_on     DATE,
            deregistered_on   DATE,
            squad_number      INTEGER,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_registration_player_team UNIQUE (player_id, team_id)
        )
    """)
    op.execute("CREATE INDEX idx_registrations_player_id ON player_registrations(player_id)")
    op.execute("CREATE INDEX idx_registrations_team_id ON player_registrations(team_id)")
    op.execute("CREATE INDEX idx_registrations_status ON player_registrations(status)")

    # groups (depends on divisions)
    op.execute("""
        CREATE TABLE groups (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
            name        VARCHAR(100) NOT NULL,
            sort_order  INTEGER NOT NULL DEFAULT 0,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX idx_groups_division_id ON groups(division_id)")

    # group_teams (junction — no soft delete)
    op.execute("""
        CREATE TABLE group_teams (
            id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            team_id  UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            CONSTRAINT uq_group_team UNIQUE (group_id, team_id)
        )
    """)
    op.execute("CREATE INDEX idx_group_teams_group_id ON group_teams(group_id)")
    op.execute("CREATE INDEX idx_group_teams_team_id ON group_teams(team_id)")

    # matches (depends on divisions + groups + teams + venues)
    op.execute("""
        CREATE TABLE matches (
            id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            division_id  UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
            group_id     UUID REFERENCES groups(id) ON DELETE SET NULL,
            home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            venue_id     UUID REFERENCES venues(id) ON DELETE SET NULL,
            round_no     INTEGER,
            matchday     INTEGER,
            kickoff_at   TIMESTAMPTZ,
            status       match_status NOT NULL DEFAULT 'scheduled',
            home_score   INTEGER DEFAULT 0,
            away_score   INTEGER DEFAULT 0,
            notes        TEXT,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at   TIMESTAMPTZ,
            CONSTRAINT ck_match_different_teams CHECK (home_team_id != away_team_id)
        )
    """)
    op.execute("CREATE INDEX idx_matches_division_id ON matches(division_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_matches_group_id ON matches(group_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_matches_home_team_id ON matches(home_team_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_matches_away_team_id ON matches(away_team_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_matches_kickoff_at ON matches(kickoff_at) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_matches_status ON matches(status) WHERE deleted_at IS NULL")

    # match_lineups (depends on matches + teams + players + player_registrations)
    op.execute("""
        CREATE TABLE match_lineups (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            registration_id UUID REFERENCES player_registrations(id) ON DELETE SET NULL,
            is_starting     BOOLEAN NOT NULL DEFAULT TRUE,
            bench_order     INTEGER,
            shirt_number    INTEGER,
            position_code   VARCHAR(20),
            is_captain      BOOLEAN NOT NULL DEFAULT FALSE,
            minute_on       INTEGER,
            minute_off      INTEGER,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_lineup_match_team_player UNIQUE (match_id, team_id, player_id)
        )
    """)
    op.execute("CREATE INDEX idx_lineups_match_id ON match_lineups(match_id)")
    op.execute("CREATE INDEX idx_lineups_team_id ON match_lineups(team_id)")
    op.execute("CREATE INDEX idx_lineups_player_id ON match_lineups(player_id)")

    # match_events (depends on matches + teams + players + player_registrations)
    op.execute("""
        CREATE TABLE match_events (
            id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            team_id           UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            player_id         UUID REFERENCES players(id) ON DELETE SET NULL,
            related_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
            registration_id   UUID REFERENCES player_registrations(id) ON DELETE SET NULL,
            minute            INTEGER,
            extra_minute      INTEGER,
            event_type        event_type NOT NULL,
            notes             TEXT,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX idx_events_match_id ON match_events(match_id)")
    op.execute("CREATE INDEX idx_events_team_id ON match_events(team_id)")
    op.execute("CREATE INDEX idx_events_player_id ON match_events(player_id)")
    op.execute("CREATE INDEX idx_events_event_type ON match_events(event_type)")

    # media_posts (depends on organizations)
    op.execute("""
        CREATE TABLE media_posts (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            title           VARCHAR(255),
            body            TEXT,
            media_url       VARCHAR(500),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at      TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX idx_media_posts_organization_id ON media_posts(organization_id) WHERE deleted_at IS NULL")


def downgrade():
    tables = [
        "media_posts",
        "match_events",
        "match_lineups",
        "matches",
        "group_teams",
        "groups",
        "player_registrations",
        "teams",
        "club_player_memberships",
        "transfers",
        "players",
        "clubs",
        "memberships",
        "football_structures",
        "divisions",
        "seasons",
        "competitions",
        "venues",
        "organizations",
        "users",
    ]
    for tbl in tables:
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE")
    for enum in ("format_type", "transfer_type", "player_position", "match_status", "event_type", "user_role", "structure_type"):
        op.execute(f"DROP TYPE IF EXISTS {enum} CASCADE")
