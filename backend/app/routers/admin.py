"""Super admin router — only accessible by admin role users"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, UserRole, Organization, Competition, Membership
from app.deps import get_current_user
from app.security import hash_password
from app.schemas.auth import UserResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(user: User = Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class CreateOrganiserUserRequest(BaseModel):
    email: EmailStr
    password: str
    organiser_name: str
    short_name: Optional[str] = None
    organization_type: Optional[str] = None


class OrganiserUserResponse(BaseModel):
    user_id: UUID
    email: str
    organiser_id: UUID
    organiser_name: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.post("/organiser-accounts", response_model=OrganiserUserResponse, status_code=201)
async def create_organiser_account(
    req: CreateOrganiserUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing = await db.execute(
        select(User).where(User.email == req.email, User.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole.ORGANISER,
    )
    db.add(user)
    await db.flush()

    org = Organization(
        owner_user_id=user.id,
        name=req.organiser_name,
        short_name=req.short_name,
        organization_type=req.organization_type,
        status="active",
    )
    db.add(org)
    await db.flush()

    membership = Membership(user_id=user.id, organization_id=org.id, role="owner")
    db.add(membership)
    await db.commit()
    await db.refresh(user)
    await db.refresh(org)

    return OrganiserUserResponse(
        user_id=user.id,
        email=user.email,
        organiser_id=org.id,
        organiser_name=org.name,
        created_at=user.created_at,
    )


@router.get("/organiser-accounts", response_model=list[OrganiserUserResponse])
async def list_organiser_accounts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(
        select(User, Organization)
        .join(Organization, Organization.owner_user_id == User.id)
        .where(User.deleted_at.is_(None), User.role == UserRole.ORGANISER, Organization.deleted_at.is_(None))
        .order_by(User.created_at.desc())
    )
    rows = result.all()
    return [
        OrganiserUserResponse(
            user_id=row.User.id,
            email=row.User.email,
            organiser_id=row.Organization.id,
            organiser_name=row.Organization.name,
            created_at=row.User.created_at,
        )
        for row in rows
    ]


@router.delete("/organiser-accounts/{user_id}", status_code=204)
async def delete_organiser_account(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot delete admin accounts")
    user.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.get("/competitions")
async def list_all_competitions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(
        select(Competition, Organization.name.label("org_name"))
        .join(Organization)
        .where(Competition.deleted_at.is_(None))
        .order_by(Organization.name.asc(), Competition.name.asc())
    )
    rows = result.all()
    return [
        {
            "id": str(row.Competition.id),
            "name": row.Competition.name,
            "competition_type": row.Competition.competition_type,
            "scope_level": row.Competition.scope_level,
            "org_name": row.org_name,
        }
        for row in rows
    ]


@router.patch("/competitions/{competition_id}/move")
async def move_competition(
    competition_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id, Competition.deleted_at.is_(None))
    )
    competition = result.scalar_one_or_none()
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    new_org_id = data.get("organization_id")
    if not new_org_id:
        raise HTTPException(status_code=400, detail="organization_id required")

    org_result = await db.execute(
        select(Organization).where(Organization.id == UUID(new_org_id), Organization.deleted_at.is_(None))
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organization not found")

    competition.organization_id = UUID(new_org_id)
    await db.commit()
    return {"success": True}


class ResetPasswordRequest(BaseModel):
    new_password: str


@router.post("/organiser-accounts/{user_id}/reset-password")
async def reset_organiser_password(
    user_id: UUID,
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(req.new_password)
    await db.commit()
    return {"success": True}
