from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from schema.models import (
    Division,
    Group,
    GroupTeam,
    Match,
    Player,
    PlayerRegistration,
    Season,
    Team,
)


class ValidationError(Exception):
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.field = field


def _require(condition: bool, message: str, field: Optional[str] = None) -> None:
    if not condition:
        raise ValidationError(message, field)


async def populate_team_snapshots(db: AsyncSession, team: Team) -> None:
    division = await db.get(Division, team.division_id)
    if division is not None:
        team.age_group_snapshot = division.age_group
        team.gender_snapshot = division.gender
        team.division_name_snapshot = division.name


async def validate_registration_creation(
    db: AsyncSession,
    player_id: uuid.UUID,
    team_id: uuid.UUID,
    exclude_registration_id: Optional[uuid.UUID] = None,
) -> None:
    """
    Rules:
    - If division has age limits, player date_of_birth is required.
    - Player date_of_birth must satisfy division min_birthdate / max_birthdate.
    - A player may have multiple registrations in the same season only if
      all those registrations are within the same club.
    """
    player: Player | None = await db.get(Player, player_id)
    _require(player is not None, "Player not found.", "player_id")
    _require(player.deleted_at is None, "Player is deleted.", "player_id")

    team: Team | None = await db.get(Team, team_id)
    _require(team is not None, "Team not found.", "team_id")
    _require(team.deleted_at is None, "Team is deleted.", "team_id")

    division: Division | None = await db.get(Division, team.division_id)
    _require(division is not None, "Division not found.", "team_id")

    season: Season | None = await db.get(Season, division.season_id)
    _require(season is not None, "Season not found.", "team_id")

    has_age_gate = division.min_birthdate is not None or division.max_birthdate is not None
    if has_age_gate:
        _require(
            player.date_of_birth is not None,
            "Player date of birth is required for this division.",
            "date_of_birth",
        )

    if player.date_of_birth is not None:
        dob = player.date_of_birth
        if division.min_birthdate is not None:
            _require(
                dob >= division.min_birthdate,
                f"Player date of birth {dob} is before division minimum birthdate {division.min_birthdate}.",
                "date_of_birth",
            )
        if division.max_birthdate is not None:
            _require(
                dob <= division.max_birthdate,
                f"Player date of birth {dob} is after division maximum birthdate {division.max_birthdate}.",
                "date_of_birth",
            )

    stmt = (
        select(PlayerRegistration, Team, Division)
        .join(Team, PlayerRegistration.team_id == Team.id)
        .join(Division, Team.division_id == Division.id)
        .where(
            PlayerRegistration.player_id == player_id,
            PlayerRegistration.status.in_(["pending", "approved", "active"]),
            Division.season_id == season.id,
            Team.deleted_at.is_(None),
            Team.id != team_id,
        )
    )

    if exclude_registration_id is not None:
        stmt = stmt.where(PlayerRegistration.id != exclude_registration_id)

    existing_regs = (await db.execute(stmt)).all()

    for reg, other_team, _other_division in existing_regs:
        _require(
            other_team.club_id == team.club_id,
            (
                f"Player already has a same-season registration with a different club "
                f"(club_id={other_team.club_id}) in season '{season.name}'. "
                "Multiple registrations in the same season are only allowed within the same club."
            ),
            "team_id",
        )


async def validate_match_teams(
    db: AsyncSession,
    division_id: uuid.UUID,
    home_team_id: uuid.UUID,
    away_team_id: uuid.UUID,
    group_id: Optional[uuid.UUID] = None,
) -> None:
    """
    Rules:
    - Both teams must belong to the match division.
    - If group_id is provided, the group must belong to the same division and both teams must belong to that group.
    """
    home_team: Team | None = await db.get(Team, home_team_id)
    away_team: Team | None = await db.get(Team, away_team_id)

    _require(home_team is not None, "Home team not found.", "home_team_id")
    _require(away_team is not None, "Away team not found.", "away_team_id")
    _require(home_team.deleted_at is None, "Home team is deleted.", "home_team_id")
    _require(away_team.deleted_at is None, "Away team is deleted.", "away_team_id")

    _require(
        home_team.division_id == division_id,
        "Home team does not belong to the specified division.",
        "home_team_id",
    )
    _require(
        away_team.division_id == division_id,
        "Away team does not belong to the specified division.",
        "away_team_id",
    )

    if group_id is not None:
        group: Group | None = await db.get(Group, group_id)
        _require(group is not None, "Group not found.", "group_id")
        _require(
            group.division_id == division_id,
            "Group does not belong to the specified division.",
            "group_id",
        )

        home_in_group = await db.execute(
            select(GroupTeam).where(
                GroupTeam.group_id == group_id,
                GroupTeam.team_id == home_team.id,
            )
        )
        away_in_group = await db.execute(
            select(GroupTeam).where(
                GroupTeam.group_id == group_id,
                GroupTeam.team_id == away_team.id,
            )
        )

        _require(
            home_in_group.scalar_one_or_none() is not None,
            "Home team is not in the specified group.",
            "group_id",
        )
        _require(
            away_in_group.scalar_one_or_none() is not None,
            "Away team is not in the specified group.",
            "group_id",
        )


async def validate_lineup_creation(
    db: AsyncSession,
    match_id: uuid.UUID,
    team_id: uuid.UUID,
    player_id: uuid.UUID,
) -> None:
    match: Match | None = await db.get(Match, match_id)
    _require(match is not None, "Match not found.", "match_id")

    _require(
        team_id in (match.home_team_id, match.away_team_id),
        "Team does not participate in this match.",
        "team_id",
    )

    await _require_player_registered(db, player_id, team_id)


async def validate_event_creation(
    db: AsyncSession,
    match_id: uuid.UUID,
    team_id: uuid.UUID,
    player_id: Optional[uuid.UUID],
) -> None:
    match: Match | None = await db.get(Match, match_id)
    _require(match is not None, "Match not found.", "match_id")

    _require(
        team_id in (match.home_team_id, match.away_team_id),
        "Team does not participate in this match.",
        "team_id",
    )

    if player_id is not None:
        await _require_player_registered(db, player_id, team_id)


async def _require_player_registered(
    db: AsyncSession,
    player_id: uuid.UUID,
    team_id: uuid.UUID,
) -> None:
    result = await db.execute(
        select(PlayerRegistration).where(
            PlayerRegistration.player_id == player_id,
            PlayerRegistration.team_id == team_id,
            PlayerRegistration.status.in_(["approved", "active"]),
        )
    )
    reg = result.scalar_one_or_none()

    _require(
        reg is not None,
        "Player does not have an approved/active registration for this team.",
        "player_id",
    )