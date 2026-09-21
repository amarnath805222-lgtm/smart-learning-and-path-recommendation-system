"""Admin router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from app.database import get_db
from app.models import User, StudentProfile, Skill, Course, QuizAttempt, LearningPath
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/students")
async def list_students(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User, StudentProfile)
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)
        .where(User.is_admin == False)
    )
    students = []
    for user, profile in result.all():
        students.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "career_goal": profile.career_goal if profile else None,
            "overall_progress": profile.overall_progress if profile else 0,
            "onboarding_completed": profile.onboarding_completed if profile else False,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        })
    return {"students": students, "total": len(students)}


@router.get("/skills")
async def list_skills(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Skill).where(Skill.is_active == True))
    skills = result.scalars().all()
    return {"skills": [
        {"id": s.id, "name": s.name, "category": s.category, "difficulty": s.difficulty}
        for s in skills
    ]}


class CreateSkillRequest(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    difficulty: str = "beginner"
    color: str = "#6c63ff"


@router.post("/skills")
async def create_skill(
    req: CreateSkillRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    skill = Skill(
        id=str(uuid.uuid4()),
        name=req.name,
        category=req.category,
        description=req.description,
        difficulty=req.difficulty,
        color=req.color,
        created_at=datetime.utcnow(),
    )
    db.add(skill)
    await db.commit()
    return {"message": "Skill created", "id": skill.id}


@router.get("/analytics")
async def admin_analytics(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    total_users = await db.execute(select(func.count(User.id)).where(User.is_admin == False))
    total = total_users.scalar() or 0

    onboarded = await db.execute(
        select(func.count(StudentProfile.id)).where(StudentProfile.onboarding_completed == True)
    )
    onboarded_count = onboarded.scalar() or 0

    quizzes = await db.execute(select(func.count(QuizAttempt.id)))
    quiz_count = quizzes.scalar() or 0

    avg_score = await db.execute(select(func.avg(QuizAttempt.score)))
    avg = avg_score.scalar() or 0

    paths = await db.execute(select(func.count(LearningPath.id)))
    path_count = paths.scalar() or 0

    return {
        "total_students": total,
        "onboarded_students": onboarded_count,
        "total_quiz_attempts": quiz_count,
        "avg_quiz_score": round(avg, 1),
        "learning_paths_generated": path_count,
    }
