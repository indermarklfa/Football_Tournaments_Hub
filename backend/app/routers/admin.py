"""Super admin router — only accessible by admin role users"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import User, UserRole, Organiser, Tournament
from app.deps import get_current_user
from app.security import hash_password
from app.schemas.auth import UserResponse
from app.schemas.organiser import OrganiserResponse
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
    organiser_location: Optional[str] = None
    organiser_description: Optional[str] = None


class OrganiserUserResponse(BaseModel):
    user_id: UUID
    email: str
    organiser_id: UUID
    organiser_name: str
    organiser_location: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all users"""
    result = await db.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.post("/organiser-accounts", response_model=OrganiserUserResponse, status_code=201)
async def create_organiser_account(
    req: CreateOrganiserUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create a new organiser user + their organiser profile in one step"""
    # Check email not taken
    existing = await db.execute(
        select(User).where(User.email == req.email, User.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole.ORGANISER,
    )
    db.add(user)
    await db.flush()

    # Create their organiser profile
    organiser = Organiser(
        owner_user_id=user.id,
        name=req.organiser_name,
        location=req.organiser_location,
        description=req.organiser_description,
    )
    db.add(organiser)
    await db.commit()
    await db.refresh(user)
    await db.refresh(organiser)

    return OrganiserUserResponse(
        user_id=user.id,
        email=user.email,
        organiser_id=organiser.id,
        organiser_name=organiser.name,
        organiser_location=organiser.location,
        created_at=user.created_at,
    )


@router.get("/organiser-accounts", response_model=list[OrganiserUserResponse])
async def list_organiser_accounts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all organiser users with their organiser profile"""
    result = await db.execute(
        select(User, Organiser)
        .join(Organiser, Organiser.owner_user_id == User.id)
        .where(User.deleted_at.is_(None), User.role == UserRole.ORGANISER)
        .order_by(User.created_at.desc())
    )
    rows = result.all()
    return [
        OrganiserUserResponse(
            user_id=row.User.id,
            email=row.User.email,
            organiser_id=row.Organiser.id,
            organiser_name=row.Organiser.name,
            organiser_location=row.Organiser.location,
            created_at=row.User.created_at,
        )
        for row in rows
    ]


@router.delete("/organiser-accounts/{user_id}", status_code=204)
async def delete_organiser_account(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Soft delete an organiser account"""
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


@router.get("/tournaments")
async def list_all_tournaments(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all tournaments across all organisers"""
    result = await db.execute(
        select(Tournament, Organiser.name.label("organiser_name"))
        .join(Organiser)
        .where(Tournament.deleted_at.is_(None))
        .order_by(Organiser.name.asc(), Tournament.name.asc())
    )
    rows = result.all()
    return [
        {
            "id": str(row.Tournament.id),
            "name": row.Tournament.name,
            "description": row.Tournament.description,
            "age_group": row.Tournament.age_group,
            "organiser_name": row.organiser_name,
        }
        for row in rows
    ]

@router.patch("/tournaments/{tournament_id}/move")
async def move_tournament(
    tournament_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Move a tournament to a different organiser"""
    result = await db.execute(
        select(Tournament).where(Tournament.id == tournament_id, Tournament.deleted_at.is_(None))
    )
    tournament = result.scalar_one_or_none()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    new_organiser_id = data.get("organiser_id")
    if not new_organiser_id:
        raise HTTPException(status_code=400, detail="organiser_id required")

    # Verify new organiser exists
    org_result = await db.execute(
        select(Organiser).where(Organiser.id == UUID(new_organiser_id), Organiser.deleted_at.is_(None))
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organiser not found")

    tournament.organiser_id = UUID(new_organiser_id)
    await db.commit()
    return {"success": True}

class ResetPasswordRequest(BaseModel):
    new_password: str

@router.post("/organiser-accounts/{user_id}/reset-password")
async def reset_organiser_password(
    user_id: UUID,
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
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