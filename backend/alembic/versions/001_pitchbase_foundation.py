"""pitchbase foundation

Revision ID: 001
Revises:
Create Date: 2026-03-09

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.execute("CREATE TYPE user_role AS ENUM ('admin', 'organiser')")
    op.execute("CREATE TYPE edition_format AS ENUM ('knockout', 'groups_knockout', 'league')")
    op.execute("CREATE TYPE edition_status AS ENUM ('upcoming', 'active', 'completed')")
    op.execute("CREATE TYPE match_stage AS ENUM ('group', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final')")
    op.execute("CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'penalties', 'completed', 'postponed', 'cancelled')")
    op.execute("CREATE TYPE event_type AS ENUM ('goal', 'yellow_card', 'red_card', 'own_goal', 'substitution', 'penalty_scored', 'penalty_missed', 'shootout_scored', 'shootout_missed')")
    op.execute("CREATE TYPE player_position AS ENUM ('goalkeeper', 'defender', 'midfielder', 'forward')")
    op.execute("CREATE TYPE membership_role AS ENUM ('platform_owner', 'platform_admin', 'platform_support', 'org_owner', 'org_admin', 'competition_admin', 'fixtures_manager', 'registrations_manager', 'stats_manager', 'finance_manager', 'media_manager', 'club_admin', 'team_manager', 'coach', 'match_commissioner', 'referee_capture_user')")
    op.execute("CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected', 'suspended')")
    op.execute("CREATE TYPE surface_type AS ENUM ('grass', 'artificial', 'futsal', 'sand', 'other')")

    op.execute("""
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role user_role NOT NULL DEFAULT 'organiser',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT users_email_unique UNIQUE (email)
        )
    """)
    op.execute("CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE organizations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(120),
            description TEXT,
            location VARCHAR(255),
            city VARCHAR(100),
            province VARCHAR(100),
            country VARCHAR(100) NOT NULL DEFAULT 'South Africa',
            logo_url VARCHAR(500),
            banner_url VARCHAR(500),
            website_url VARCHAR(500),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            onboarded_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT organizations_name_per_owner_unique UNIQUE (created_by_user_id, name)
        )
    """)
    op.execute("CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_organizations_country ON organizations(country) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE memberships (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
            role membership_role NOT NULL,
            scope_type VARCHAR(50),
            scope_id UUID,
            granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
            granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT memberships_unique_role UNIQUE (user_id, organization_id, role, scope_id)
        )
    """)
    op.execute("CREATE INDEX idx_memberships_user_id ON memberships(user_id) WHERE is_active = TRUE")
    op.execute("CREATE INDEX idx_memberships_organization_id ON memberships(organization_id) WHERE is_active = TRUE")

    op.execute("""
        CREATE TABLE competitions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(120),
            description TEXT,
            logo_url VARCHAR(500),
            banner_url VARCHAR(500),
            sport_type VARCHAR(50) NOT NULL DEFAULT 'football',
            visibility VARCHAR(20) NOT NULL DEFAULT 'public',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT competitions_name_per_org_unique UNIQUE (organization_id, name)
        )
    """)
    op.execute("CREATE INDEX idx_competitions_organization_id ON competitions(organization_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_competitions_slug ON competitions(slug) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE seasons (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(120),
            year INTEGER NOT NULL,
            start_date DATE,
            end_date DATE,
            venue VARCHAR(255),
            format edition_format NOT NULL DEFAULT 'groups_knockout',
            status edition_status NOT NULL DEFAULT 'upcoming',
            description TEXT,
            banner_url VARCHAR(500),
            registration_deadline DATE,
            max_teams INTEGER,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT seasons_year_per_competition_unique UNIQUE (competition_id, year)
        )
    """)
    op.execute("CREATE INDEX idx_seasons_competition_id ON seasons(competition_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_seasons_status ON seasons(status) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE venues (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(120),
            address TEXT,
            city VARCHAR(100),
            province VARCHAR(100),
            country VARCHAR(100) NOT NULL DEFAULT 'South Africa',
            capacity INTEGER,
            surface_type surface_type,
            latitude DECIMAL(9,6),
            longitude DECIMAL(9,6),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE
        )
    """)
    op.execute("CREATE INDEX idx_venues_organization_id ON venues(organization_id) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE clubs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(120),
            short_name VARCHAR(50),
            logo_url VARCHAR(500),
            home_venue VARCHAR(255),
            city VARCHAR(100),
            province VARCHAR(100),
            founded_year INTEGER,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_public BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT clubs_name_per_org_unique UNIQUE (organization_id, name)
        )
    """)
    op.execute("CREATE INDEX idx_clubs_organization_id ON clubs(organization_id) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE teams (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
            club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(120),
            short_name VARCHAR(50),
            logo_url VARCHAR(500),
            is_public BOOLEAN NOT NULL DEFAULT TRUE,
            home_colors VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT teams_name_per_season_unique UNIQUE (season_id, name)
        )
    """)
    op.execute("CREATE INDEX idx_teams_season_id ON teams(season_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_teams_club_id ON teams(club_id) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE players (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(120),
            jersey_number INTEGER,
            position player_position,
            date_of_birth DATE,
            nationality VARCHAR(100),
            profile_image VARCHAR(500),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE
        )
    """)
    op.execute("CREATE INDEX idx_players_club_id ON players(club_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_players_name ON players(name) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE player_registrations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
            registration_number VARCHAR(100),
            status registration_status NOT NULL DEFAULT 'approved',
            jersey_number INTEGER,
            registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            approved_at TIMESTAMP WITH TIME ZONE,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT player_reg_unique_per_season UNIQUE (player_id, season_id)
        )
    """)
    op.execute("CREATE INDEX idx_player_registrations_player_id ON player_registrations(player_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_player_registrations_team_id ON player_registrations(team_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_player_registrations_season_id ON player_registrations(season_id) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE groups (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
            name VARCHAR(50) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT groups_name_per_season_unique UNIQUE (season_id, name)
        )
    """)
    op.execute("CREATE INDEX idx_groups_season_id ON groups(season_id) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE group_teams (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT group_teams_unique UNIQUE (group_id, team_id)
        )
    """)

    op.execute("""
        CREATE TABLE matches (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
            group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
            venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
            stage match_stage NOT NULL DEFAULT 'group',
            matchday INTEGER,
            kickoff_datetime TIMESTAMP WITH TIME ZONE,
            venue VARCHAR(255),
            home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            home_score INTEGER DEFAULT 0,
            away_score INTEGER DEFAULT 0,
            home_penalties INTEGER,
            away_penalties INTEGER,
            status match_status NOT NULL DEFAULT 'scheduled',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE
        )
    """)
    op.execute("CREATE INDEX idx_matches_season_id ON matches(season_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_matches_status ON matches(status) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE match_events (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
            player_id UUID REFERENCES players(id) ON DELETE SET NULL,
            event_type event_type NOT NULL,
            minute INTEGER,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE
        )
    """)
    op.execute("CREATE INDEX idx_match_events_match_id ON match_events(match_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_match_events_player_id ON match_events(player_id) WHERE deleted_at IS NULL")

    op.execute("""
        CREATE TABLE media_posts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
            competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
            title VARCHAR(255),
            body TEXT,
            image_url VARCHAR(500),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE
        )
    """)


def downgrade():
    pass
