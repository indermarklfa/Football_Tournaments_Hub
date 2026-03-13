"""Groups router"""
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.db import get_db
from app.deps import get_current_user
from app.models import (
    User, UserRole, Organization, Competition, Season, Division, Group, GroupTeam,
)

router = APIRouter(prefix="/groups", tags=["groups"])


async def verify_division_ownership(db: AsyncSession, division_id: UUID, user: User):
    if user.role == UserRole.ADMIN:
        return
    result = await db.execute(
        select(Division)
        .join(Season, Season.id == Division.season_id)
        .join(Competition, Competition.id == Season.competition_id)
        .join(Organization, Organization.id == Competition.organization_id)
        .where(
            Division.id == division_id,
            Division.deleted_at.is_(None),
            Organization.owner_user_id == user.id,
            Organization.deleted_at.is_(None),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="No access to this division")


async def get_group_with_ownership(db: AsyncSession, group_id: UUID, user: User) -> Group:
    if user.role == UserRole.ADMIN:
        result = await db.execute(select(Group).where(Group.id == group_id))
    else:
        result = await db.execute(
            select(Group)
            .join(Division, Division.id == Group.division_id)
            .join(Season, Season.id == Division.season_id)
            .join(Competition, Competition.id == Season.competition_id)
            .join(Organization, Organization.id == Competition.organization_id)
            .where(
                Group.id == group_id,
                Organization.owner_user_id == user.id,
                Organization.deleted_at.is_(None),
            )
        )
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return g


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_group(
    division_id: UUID,
    name: str,
    sort_order: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_division_ownership(db, division_id, user)
    g = Group(division_id=division_id, name=name, sort_order=sort_order)
    try:
        db.add(g)
        await db.commit()
        await db.refresh(g)
        return {
            "id": str(g.id),
            "division_id": str(g.division_id),
            "name": g.name,
            "sort_order": g.sort_order,
        }
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig)
        raise HTTPException(status_code=409, detail="This action conflicts with existing match event data.")


@router.get("")
async def list_groups(
    division_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_division_ownership(db, division_id, user)
    result = await db.execute(
        select(Group).where(Group.division_id == division_id).order_by(Group.sort_order, Group.name)
    )
    groups = result.scalars().all()
    group_ids = [g.id for g in groups]
    memberships_result = await db.execute(
        select(GroupTeam).where(GroupTeam.group_id.in_(group_ids))
    )
    memberships = memberships_result.scalars().all()
    team_ids_map = {}
    for m in memberships:
        team_ids_map.setdefault(m.group_id, []).append(str(m.team_id))
    return [
        {
            "id": str(g.id),
            "division_id": str(g.division_id),
            "name": g.name,
            "sort_order": g.sort_order,
            "team_ids": team_ids_map.get(g.id, []),
        }
        for g in groups
    ]


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    g = await get_group_with_ownership(db, group_id, user)
    await db.delete(g)
    await db.commit()


@router.post("/{group_id}/teams/{team_id}", status_code=status.HTTP_201_CREATED)
async def add_team_to_group(
    group_id: UUID,
    team_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    g = await get_group_with_ownership(db, group_id, user)
    existing = await db.execute(
        select(GroupTeam).where(GroupTeam.group_id == group_id, GroupTeam.team_id == team_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Team already in group")
    gt = GroupTeam(group_id=group_id, team_id=team_id)
    db.add(gt)
    await db.commit()
    return {"group_id": str(group_id), "team_id": str(team_id)}


@router.delete("/{group_id}/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_from_group(
    group_id: UUID,
    team_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await get_group_with_ownership(db, group_id, user)
    result = await db.execute(
        select(GroupTeam).where(GroupTeam.group_id == group_id, GroupTeam.team_id == team_id)
    )
    gt = result.scalar_one_or_none()
    if not gt:
        raise HTTPException(status_code=404, detail="Team not in group")
    await db.delete(gt)
    await db.commit()
