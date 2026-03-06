"""Add penalty scores to matches

Revision ID: 003
Revises: 002
Create Date: 2026-03-06
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('matches', sa.Column('home_penalties', sa.Integer(), nullable=True))
    op.add_column('matches', sa.Column('away_penalties', sa.Integer(), nullable=True))

def downgrade():
    op.drop_column('matches', 'home_penalties')
    op.drop_column('matches', 'away_penalties')