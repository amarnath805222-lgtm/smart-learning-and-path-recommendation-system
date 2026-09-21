"""Student profile router."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import User, StudentProfile, StudentSkill, Skill
from app.routers.auth import get_current_user

router = APIRouter(prefix="/student", tags=["student"])


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    education_level: Optional[str] = None
    branch: Optional[str] = None
    career_goal: Optional[str] = None
    daily_learning_minutes: Optional[int] = None
    learning_style: Optional[str] = None
    programming_languages: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    completed_courses: Optional[List[str]] = None
    current_skill_level: Optional[str] = None
    onboarding_completed: Optional[bool] = None


@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    # Get student skills
    skills_result = await db.execute(
        select(StudentSkill, Skill)
        .join(Skill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.profile_id == profile.id if profile else "")
    )
    skill_data = []
    for ss, skill in skills_result.all():
        skill_data.append({
            "skill_id": skill.id,
            "name": skill.name,
            "category": skill.category,
            "level": ss.level,
            "status": ss.status,
        })

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "avatar_url": current_user.avatar_url,
            "is_admin": current_user.is_admin,
        },
        "profile": {
            "education_level": profile.education_level if profile else None,
            "branch": profile.branch if profile else None,
            "career_goal": profile.career_goal if profile else None,
            "daily_learning_minutes": profile.daily_learning_minutes if profile else 60,
            "learning_style": profile.learning_style if profile else "mixed",
            "programming_languages": profile.programming_languages if profile else [],
            "interests": profile.interests if profile else [],
            "completed_courses": profile.completed_courses if profile else [],
            "current_skill_level": profile.current_skill_level if profile else "beginner",
            "onboarding_completed": profile.onboarding_completed if profile else False,
            "assessment_completed": profile.assessment_completed if profile else False,
            "overall_progress": profile.overall_progress if profile else 0.0,
            "streak_days": profile.streak_days if profile else 0,
            "total_learning_minutes": profile.total_learning_minutes if profile else 0,
        },
        "skills": skill_data,
    }


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Update user name if provided
    if data.full_name:
        current_user.full_name = data.full_name
        current_user.updated_at = datetime.utcnow()

    # Update student profile
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = data.model_dump(exclude_none=True, exclude={"full_name"})
    for key, value in update_data.items():
        if hasattr(profile, key):
            setattr(profile, key, value)

    profile.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "Profile updated successfully"}
