-- =============================================================================
-- Multi-Tenant Football Tournament Platform - PostgreSQL Schema
-- =============================================================================
-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'organiser');
CREATE TYPE edition_format AS ENUM ('knockout', 'groups_knockout', 'league');
CREATE TYPE edition_status AS ENUM ('upcoming', 'active', 'completed');
CREATE TYPE match_stage AS ENUM ('group', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'completed', 'postponed', 'cancelled');
CREATE TYPE event_type AS ENUM ('goal', 'yellow_card', 'red_card', 'own_goal', 'substitution', 'penalty_scored', 'penalty_missed');
CREATE TYPE player_position AS ENUM ('goalkeeper', 'defender', 'midfielder', 'forward');

-- =============================================================================
-- USERS TABLE
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'organiser',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- =============================================================================
-- ORGANISERS TABLE
-- =============================================================================

CREATE TABLE organisers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    logo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT organisers_name_per_owner_unique UNIQUE (owner_user_id, name)
);

CREATE INDEX idx_organisers_owner_user_id ON organisers(owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organisers_name ON organisers(name) WHERE deleted_at IS NULL;

-- =============================================================================
-- TOURNAMENTS TABLE
-- =============================================================================

CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organiser_id UUID NOT NULL REFERENCES organisers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT tournaments_name_per_organiser_unique UNIQUE (organiser_id, name)
);

CREATE INDEX idx_tournaments_organiser_id ON tournaments(organiser_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tournaments_name ON tournaments(name) WHERE deleted_at IS NULL;

-- =============================================================================
-- EDITIONS TABLE
-- =============================================================================

CREATE TABLE editions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    venue VARCHAR(255),
    format edition_format NOT NULL DEFAULT 'groups_knockout',
    status edition_status NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT editions_year_per_tournament_unique UNIQUE (tournament_id, year)
);

CREATE INDEX idx_editions_tournament_id ON editions(tournament_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_editions_status ON editions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_editions_year ON editions(year) WHERE deleted_at IS NULL;
CREATE INDEX idx_editions_start_date ON editions(start_date) WHERE deleted_at IS NULL;

-- =============================================================================
-- TEAMS TABLE
-- =============================================================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    coach_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT teams_name_per_edition_unique UNIQUE (edition_id, name)
);

CREATE INDEX idx_teams_edition_id ON teams(edition_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_name ON teams(name) WHERE deleted_at IS NULL;

-- =============================================================================
-- PLAYERS TABLE
-- =============================================================================

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    jersey_number INTEGER,
    position player_position,
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT players_jersey_per_team_unique UNIQUE (team_id, jersey_number)
);

CREATE INDEX idx_players_team_id ON players(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_players_name ON players(name) WHERE deleted_at IS NULL;

-- =============================================================================
-- GROUPS TABLE
-- =============================================================================

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT groups_name_per_edition_unique UNIQUE (edition_id, name)
);

CREATE INDEX idx_groups_edition_id ON groups(edition_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- GROUP TEAM MEMBERSHIP TABLE (Junction Table)
-- =============================================================================

CREATE TABLE group_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT group_teams_unique UNIQUE (group_id, team_id)
);

CREATE INDEX idx_group_teams_group_id ON group_teams(group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_group_teams_team_id ON group_teams(team_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- MATCHES TABLE
-- =============================================================================

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    stage match_stage NOT NULL DEFAULT 'group',
    matchday INTEGER,
    kickoff_datetime TIMESTAMP WITH TIME ZONE,
    venue VARCHAR(255),
    home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    status match_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT matches_different_teams CHECK (home_team_id != away_team_id)
);

CREATE INDEX idx_matches_edition_id ON matches(edition_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matches_group_id ON matches(group_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matches_home_team_id ON matches(home_team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matches_away_team_id ON matches(away_team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matches_kickoff_datetime ON matches(kickoff_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_matches_status ON matches(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_matches_stage ON matches(stage) WHERE deleted_at IS NULL;

-- =============================================================================
-- MATCH EVENTS TABLE
-- =============================================================================

CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    event_type event_type NOT NULL,
    minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 150),
    additional_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_match_events_match_id ON match_events(match_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_match_events_team_id ON match_events(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_match_events_player_id ON match_events(player_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_match_events_event_type ON match_events(event_type) WHERE deleted_at IS NULL;

-- =============================================================================
-- MEDIA POSTS TABLE
-- =============================================================================

CREATE TABLE media_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_media_posts_edition_id ON media_posts(edition_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_posts_created_at ON media_posts(created_at DESC) WHERE deleted_at IS NULL;

-- =============================================================================
-- TRIGGER FOR updated_at AUTO-UPDATE
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organisers_updated_at BEFORE UPDATE ON organisers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_editions_updated_at BEFORE UPDATE ON editions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_group_teams_updated_at BEFORE UPDATE ON group_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_match_events_updated_at BEFORE UPDATE ON match_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_posts_updated_at BEFORE UPDATE ON media_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
