"""Add shootout status and event types

Revision ID: 004
Revises: 003
Create Date: 2026-03-06
"""
from alembic import op

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None

def upgrade():
    op.execute("ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'penalties'")
    op.execute("ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'shootout_scored'")
    op.execute("ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'shootout_missed'")

def downgrade():
    pass  # PostgreSQL doesn't support removing enum values