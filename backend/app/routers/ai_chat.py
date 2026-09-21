"""AI chat router — AI Tutor and dynamic recommendations via Gemini 3.1 Flash Lite."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.models import (
    User, StudentProfile, LearningPath, LearningPathItem,
    QuizAttempt, StudentSkill, Skill
)
from app.routers.auth import get_current_user
from app.services.gemini_service import (
    chat_with_tutor, generate_recommendations, analyze_skill_gap
)

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


@router.post("/chat")
async def ai_chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Chat with AI tutor using authenticated student's real context."""
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    # Get student's learning path
    path_result = await db.execute(
        select(LearningPath).where(LearningPath.user_id == current_user.id)
    )
    path = path_result.scalar_one_or_none()

    completed_topics = []
    current_topic = None
    if path:
        items_result = await db.execute(
            select(LearningPathItem)
            .where(LearningPathItem.path_id == path.id)
            .order_by(LearningPathItem.order_index)
        )
        items = items_result.scalars().all()
        completed_topics = [i.topic_name for i in items if i.status == "completed"]
        in_progress = [i for i in items if i.status == "in_progress"]
        available = [i for i in items if i.status == "available"]
        if in_progress:
            current_topic = in_progress[0].topic_name
        elif available:
            current_topic = available[0].topic_name

    # Get student's weak skills from database
    weak_skills = []
    if profile:
        skills_res = await db.execute(
            select(StudentSkill, Skill)
            .join(Skill, StudentSkill.skill_id == Skill.id)
            .where(StudentSkill.profile_id == profile.id, StudentSkill.level < 60)
        )
        weak_skills = [s.name for _, s in skills_res.all()]

    student_context = {
        "name": current_user.full_name,
        "career_goal": profile.career_goal if (profile and profile.career_goal) else "Learner",
        "current_topic": current_topic or "Not started",
        "completed_topics": completed_topics,
        "overall_progress": profile.overall_progress if profile else 0,
        "weak_skills": weak_skills,
        "learning_style": profile.learning_style if profile else "mixed",
    }

    history_dicts = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    response = await chat_with_tutor(req.message, student_context, history_dicts)

    return {"response": response, "student_context": student_context}


@router.get("/recommendations")
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI-powered personalized recommendations generated solely when data exists."""
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    if not profile or not profile.assessment_completed:
        return {
            "status": "not_available",
            "message": "Complete your profile and skill assessment to generate your personalized learning path.",
            "recommendations": [],
        }

    path_result = await db.execute(
        select(LearningPath).where(LearningPath.user_id == current_user.id)
    )
    path = path_result.scalar_one_or_none()
    if not path:
        return {
            "status": "not_available",
            "message": "Learning path not yet generated.",
            "recommendations": [],
        }

    items_result = await db.execute(
        select(LearningPathItem)
        .where(LearningPathItem.path_id == path.id)
        .order_by(LearningPathItem.order_index)
    )
    items = items_result.scalars().all()
    completed_topics = [i.topic_name for i in items if i.status == "completed"]
    available = [i for i in items if i.status in ("available", "in_progress")]
    next_topic = available[0].topic_name if available else None

    # Retrieve weak skills from assessment
    skills_res = await db.execute(
        select(StudentSkill, Skill)
        .join(Skill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.profile_id == profile.id, StudentSkill.level < 60)
    )
    weak_skills = [s.name for _, s in skills_res.all()]

    student_context = {
        "career_goal": profile.career_goal,
        "overall_progress": profile.overall_progress,
        "completed_topics": completed_topics,
        "next_topic": next_topic,
        "weak_skills": weak_skills,
        "daily_learning_minutes": profile.daily_learning_minutes or 60,
    }

    try:
        recommendations = await generate_recommendations(student_context)
        return {"status": "available", "recommendations": recommendations}
    except Exception as e:
        return {
            "status": "error",
            "message": f"Could not generate recommendations: {str(e)}",
            "recommendations": [],
        }


@router.get("/skill-gap")
async def get_skill_gap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get student skill gap analysis based on authentic assessment records."""
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    if not profile or not profile.assessment_completed:
        return {
            "status": "no_data",
            "message": "Complete your skill assessment to generate your skill gap analysis.",
            "skill_levels": {},
            "required_levels": {},
            "strong_skills": [],
            "weak_skills": [],
            "missing_skills": [],
            "ai_summary": "No assessment taken yet.",
        }

    # Fetch recorded student skills
    skills_query = await db.execute(
        select(StudentSkill, Skill)
        .join(Skill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.profile_id == profile.id)
    )
    skills_rows = skills_query.all()

    skill_levels = {}
    required_levels = {}
    strong_skills = []
    weak_skills = []
    for ss, skill in skills_rows:
        val = round(ss.level or 0)
        skill_levels[skill.name] = val
        required_levels[skill.name] = 85
        if val >= 75:
            strong_skills.append(skill.name)
        else:
            weak_skills.append(skill.name)

    # Get latest quiz attempt for feedback
    attempt_res = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.completed_at.desc())
    )
    latest_attempt = attempt_res.scalars().first()

    return {
        "status": "available",
        "skill_levels": skill_levels,
        "required_levels": required_levels,
        "strong_skills": strong_skills,
        "weak_skills": weak_skills,
        "missing_skills": [],
        "ai_summary": latest_attempt.feedback if latest_attempt else "Assessment completed.",
    }
