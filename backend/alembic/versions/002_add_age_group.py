"""Add age_group to tournaments

Revision ID: 002
Revises: 001
Create Date: 2026-03-06
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001_initial'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('tournaments', sa.Column('age_group', sa.String(50), nullable=True))

def downgrade():
    op.drop_column('tournaments', 'age_group')