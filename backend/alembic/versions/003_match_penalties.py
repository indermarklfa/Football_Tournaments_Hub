"""Add penalties support to matches

Revision ID: 003_match_penalties
Revises: 002
Create Date: 2026-03-13
"""
from alembic import op
import sqlalchemy as sa

revision = "003_match_penalties"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'penalties'")

    op.add_column("matches", sa.Column("home_penalties", sa.Integer(), nullable=True))
    op.add_column("matches", sa.Column("away_penalties", sa.Integer(), nullable=True))
    op.add_column("matches", sa.Column("shootout_first_team_id", sa.UUID(), nullable=True))

    op.create_foreign_key(
        "matches_shootout_first_team_id_fkey",
        "matches",
        "teams",
        ["shootout_first_team_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_check_constraint(
        "ck_match_home_penalties_non_negative",
        "matches",
        "home_penalties IS NULL OR home_penalties >= 0",
    )
    op.create_check_constraint(
        "ck_match_away_penalties_non_negative",
        "matches",
        "away_penalties IS NULL OR away_penalties >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_match_away_penalties_non_negative", "matches", type_="check")
    op.drop_constraint("ck_match_home_penalties_non_negative", "matches", type_="check")
    op.drop_constraint("matches_shootout_first_team_id_fkey", "matches", type_="foreignkey")
    op.drop_column("matches", "shootout_first_team_id")
    op.drop_column("matches", "away_penalties")
    op.drop_column("matches", "home_penalties")