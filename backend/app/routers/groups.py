"""Groups router"""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, Organization, Competition, Season, Group, GroupTeam, Team, Match, MatchStatus
from app.deps import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


async def verify_edition_ownership(db: AsyncSession, season_id: UUID, user: User):
    if user.role.value == 'admin':
        return
    result = await db.execute(
        select(Season).join(Competition).join(Organization)
        .where(Season.id == season_id, Organization.created_by_user_id == user.id, Season.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Season not owned by user")

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_group(season_id: UUID, name: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, season_id, user)
    g = Group(season_id=season_id, name=name)
    db.add(g)
    await db.commit()
    await db.refresh(g)
    return {"id": str(g.id), "season_id": str(g.season_id), "name": g.name}


@router.get("")
async def list_groups(season_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await verify_edition_ownership(db, season_id, user)
    result = await db.execute(select(Group).where(Group.season_id == season_id, Group.deleted_at.is_(None)))
    groups = result.scalars().all()
    group_ids = [g.id for g in groups]
    memberships_result = await db.execute(
        select(GroupTeam).where(GroupTeam.group_id.in_(group_ids), GroupTeam.deleted_at.is_(None))
    )
    memberships = memberships_result.scalars().all()
    team_ids_map = {}
    for m in memberships:
        team_ids_map.setdefault(m.group_id, []).append(str(m.team_id))
    return [
        {"id": str(g.id), "season_id": str(g.season_id), "name": g.name, "team_ids": team_ids_map.get(g.id, [])}
        for g in groups
    ]


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Group).join(Season).join(Competition).join(Organization)
        .where(Group.id == group_id, Organization.created_by_user_id == user.id, Group.deleted_at.is_(None))
    )
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    g.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/{group_id}/teams/{team_id}", status_code=status.HTTP_201_CREATED)
async def add_team_to_group(group_id: UUID, team_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Group).join(Season).join(Competition).join(Organization)
        .where(Group.id == group_id, Organization.created_by_user_id == user.id, Group.deleted_at.is_(None))
    )
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    gt = GroupTeam(group_id=group_id, team_id=team_id)
    db.add(gt)
    await db.commit()
    return {"group_id": str(group_id), "team_id": str(team_id)}


@router.delete("/{group_id}/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_from_group(group_id: UUID, team_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(GroupTeam).where(GroupTeam.group_id == group_id, GroupTeam.team_id == team_id, GroupTeam.deleted_at.is_(None))
    )
    gt = result.scalar_one_or_none()
    if not gt:
        raise HTTPException(status_code=404, detail="Team not in group")
    gt.deleted_at = datetime.now(timezone.utc)
    await db.commit()
