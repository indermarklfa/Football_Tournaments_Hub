"""Add divisions table

Revision ID: 002
Revises: 001
Create Date: 2026-03-09
"""
from alembic import op

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TYPE age_group AS ENUM (
            'open', 'u9', 'u11', 'u13', 'u15', 'u17', 'u19', 'u21',
            'senior', 'veterans', 'womens', 'girls'
        )
    """)

    op.execute("""
        CREATE TABLE divisions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(120),
            age_group age_group NOT NULL DEFAULT 'open',
            format edition_format NOT NULL DEFAULT 'league',
            max_teams INTEGER,
            tier INTEGER DEFAULT 1,
            description TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT divisions_name_per_season_unique UNIQUE (season_id, name)
        )
    """)

    op.execute("CREATE INDEX idx_divisions_season_id ON divisions(season_id) WHERE deleted_at IS NULL")
    op.execute("CREATE INDEX idx_divisions_age_group ON divisions(age_group) WHERE deleted_at IS NULL")

    op.execute("ALTER TABLE teams ADD COLUMN division_id UUID REFERENCES divisions(id) ON DELETE SET NULL")
    op.execute("CREATE INDEX idx_teams_division_id ON teams(division_id) WHERE deleted_at IS NULL")

    op.execute("ALTER TABLE matches ADD COLUMN division_id UUID REFERENCES divisions(id) ON DELETE SET NULL")
    op.execute("CREATE INDEX idx_matches_division_id ON matches(division_id) WHERE deleted_at IS NULL")

    op.execute("ALTER TABLE groups ADD COLUMN division_id UUID REFERENCES divisions(id) ON DELETE SET NULL")
    op.execute("CREATE INDEX idx_groups_division_id ON groups(division_id) WHERE deleted_at IS NULL")

    op.execute("ALTER TABLE player_registrations ADD COLUMN division_id UUID REFERENCES divisions(id) ON DELETE SET NULL")


def downgrade():
    pass
