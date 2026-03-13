"""Add additive schema improvements

Revision ID: 002
Revises: 001
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Players: unique partial index on id_number for active (non-deleted) players
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_players_id_number_active
        ON public.players (id_number)
        WHERE id_number IS NOT NULL AND deleted_at IS NULL
    """)

    # 2. Teams: snapshot columns
    op.add_column('teams', sa.Column('age_group_snapshot', sa.String(length=100), nullable=True))
    op.add_column('teams', sa.Column('gender_snapshot', sa.String(length=50), nullable=True))
    op.add_column('teams', sa.Column('division_name_snapshot', sa.String(length=255), nullable=True))

    # Backfill snapshots safely
    op.execute("""
        UPDATE public.teams t
        SET
            age_group_snapshot = COALESCE(t.age_group_snapshot, d.age_group),
            gender_snapshot = COALESCE(t.gender_snapshot, d.gender),
            division_name_snapshot = COALESCE(t.division_name_snapshot, d.name)
        FROM public.divisions d
        WHERE t.division_id = d.id
    """)

    # 3. Match events enum additions
    op.execute("ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'assist'")
    op.execute("ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'penalty_shootout_scored'")
    op.execute("ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'penalty_shootout_missed'")

    # 4. Constraints

    op.execute("""
        ALTER TABLE public.matches
        DROP CONSTRAINT IF EXISTS ck_match_scores_non_negative
    """)
    op.execute("""
        ALTER TABLE public.matches
        ADD CONSTRAINT ck_match_scores_non_negative
        CHECK (
            (home_score IS NULL OR home_score >= 0)
            AND
            (away_score IS NULL OR away_score >= 0)
        )
    """)

    op.execute("""
        ALTER TABLE public.club_player_memberships
        DROP CONSTRAINT IF EXISTS ck_membership_dates_valid
    """)
    op.execute("""
        ALTER TABLE public.club_player_memberships
        ADD CONSTRAINT ck_membership_dates_valid
        CHECK (end_date IS NULL OR end_date >= start_date)
    """)

    op.execute("""
        ALTER TABLE public.player_registrations
        DROP CONSTRAINT IF EXISTS ck_registration_dates_valid
    """)
    op.execute("""
        ALTER TABLE public.player_registrations
        ADD CONSTRAINT ck_registration_dates_valid
        CHECK (
            deregistered_on IS NULL
            OR registered_on IS NULL
            OR deregistered_on >= registered_on
        )
    """)

    op.execute("""
        ALTER TABLE public.player_registrations
        DROP CONSTRAINT IF EXISTS ck_registration_squad_number_range
    """)
    op.execute("""
        ALTER TABLE public.player_registrations
        ADD CONSTRAINT ck_registration_squad_number_range
        CHECK (squad_number IS NULL OR (squad_number >= 1 AND squad_number <= 99))
    """)

    op.execute("""
        ALTER TABLE public.match_lineups
        DROP CONSTRAINT IF EXISTS ck_lineup_shirt_number_range
    """)
    op.execute("""
        ALTER TABLE public.match_lineups
        ADD CONSTRAINT ck_lineup_shirt_number_range
        CHECK (shirt_number IS NULL OR (shirt_number >= 1 AND shirt_number <= 99))
    """)

    op.execute("""
        ALTER TABLE public.match_events
        DROP CONSTRAINT IF EXISTS ck_event_minute_range
    """)
    op.execute("""
        ALTER TABLE public.match_events
        ADD CONSTRAINT ck_event_minute_range
        CHECK (minute IS NULL OR (minute >= 0 AND minute <= 130))
    """)

    op.execute("""
        ALTER TABLE public.match_events
        DROP CONSTRAINT IF EXISTS ck_event_extra_minute_range
    """)
    op.execute("""
        ALTER TABLE public.match_events
        ADD CONSTRAINT ck_event_extra_minute_range
        CHECK (extra_minute IS NULL OR (extra_minute >= 0 AND extra_minute <= 30))
    """)

    op.execute("""
        ALTER TABLE public.match_lineups
        DROP CONSTRAINT IF EXISTS ck_lineup_minute_on_range
    """)
    op.execute("""
        ALTER TABLE public.match_lineups
        ADD CONSTRAINT ck_lineup_minute_on_range
        CHECK (minute_on IS NULL OR (minute_on >= 0 AND minute_on <= 130))
    """)

    op.execute("""
        ALTER TABLE public.match_lineups
        DROP CONSTRAINT IF EXISTS ck_lineup_minute_off_range
    """)
    op.execute("""
        ALTER TABLE public.match_lineups
        ADD CONSTRAINT ck_lineup_minute_off_range
        CHECK (minute_off IS NULL OR (minute_off >= 0 AND minute_off <= 130))
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE public.match_lineups DROP CONSTRAINT IF EXISTS ck_lineup_minute_off_range")
    op.execute("ALTER TABLE public.match_lineups DROP CONSTRAINT IF EXISTS ck_lineup_minute_on_range")
    op.execute("ALTER TABLE public.match_events DROP CONSTRAINT IF EXISTS ck_event_extra_minute_range")
    op.execute("ALTER TABLE public.match_events DROP CONSTRAINT IF EXISTS ck_event_minute_range")
    op.execute("ALTER TABLE public.match_lineups DROP CONSTRAINT IF EXISTS ck_lineup_shirt_number_range")
    op.execute("ALTER TABLE public.player_registrations DROP CONSTRAINT IF EXISTS ck_registration_squad_number_range")
    op.execute("ALTER TABLE public.player_registrations DROP CONSTRAINT IF EXISTS ck_registration_dates_valid")
    op.execute("ALTER TABLE public.club_player_memberships DROP CONSTRAINT IF EXISTS ck_membership_dates_valid")
    op.execute("ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS ck_match_scores_non_negative")

    op.drop_column('teams', 'division_name_snapshot')
    op.drop_column('teams', 'gender_snapshot')
    op.drop_column('teams', 'age_group_snapshot')

    op.execute("DROP INDEX IF EXISTS uq_players_id_number_active")

    # Note:
    # PostgreSQL does not support removing enum values directly.
    # The added event_type values remain even on downgrade.