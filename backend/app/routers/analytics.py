"""Analytics router — computes genuine analytics from student data."""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import (
    User, StudentProfile, QuizAttempt, LearningPath,
    LearningPathItem, Progress, StudentSkill, Skill
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive student analytics based solely on authentic database records."""
    # Student Profile
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    # Quiz Attempts
    quiz_result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.completed_at)
    )
    attempts = quiz_result.scalars().all()

    # Learning Path Progress
    path_result = await db.execute(
        select(LearningPath).where(LearningPath.user_id == current_user.id)
    )
    path = path_result.scalar_one_or_none()

    topic_progress = []
    if path:
        items_result = await db.execute(
            select(LearningPathItem)
            .where(LearningPathItem.path_id == path.id)
            .order_by(LearningPathItem.order_index)
        )
        items = items_result.scalars().all()
        topic_progress = [
            {
                "name": item.topic_name,
                "status": item.status,
                "completed_at": item.completed_at.isoformat() if item.completed_at else None,
            }
            for item in items
        ]

    # Daily Progress Records
    progress_result = await db.execute(
        select(Progress)
        .where(Progress.user_id == current_user.id)
        .order_by(Progress.date)
    )
    progress_records = progress_result.scalars().all()

    weekly_progress = []
    for p in progress_records[-7:]:
        weekly_progress.append({
            "date": p.date,
            "minutes": p.minutes_learned,
            "quizzes": p.quizzes_taken,
            "score": p.quiz_avg_score,
            "progress": p.overall_progress,
        })

    # Quiz Performance Trend
    quiz_trend = [
        {
            "topic": a.quiz_id[:8],
            "score": a.score,
            "date": a.completed_at.isoformat() if a.completed_at else None,
        }
        for a in attempts[-10:]
    ]

    # Authentic Skill Radar from StudentSkill table
    skill_data = []
    if profile:
        skills_query = await db.execute(
            select(StudentSkill, Skill)
            .join(Skill, StudentSkill.skill_id == Skill.id)
            .where(StudentSkill.profile_id == profile.id)
        )
        for ss, skill in skills_query.all():
            skill_data.append({
                "skill": skill.name,
                "value": round(ss.level or 0),
                "fullMark": 100,
            })

    completed_count = sum(1 for t in topic_progress if t["status"] == "completed")
    total_count = len(topic_progress)

    return {
        "overview": {
            "overall_progress": profile.overall_progress if profile else 0,
            "streak_days": profile.streak_days if profile else 0,
            "total_learning_minutes": profile.total_learning_minutes if profile else 0,
            "topics_completed": completed_count,
            "total_topics": total_count,
            "quizzes_taken": len(attempts),
            "avg_quiz_score": (sum(a.score for a in attempts) / len(attempts)) if attempts else 0,
            "career_goal": profile.career_goal if (profile and profile.career_goal) else "Not set",
        },
        "weekly_progress": weekly_progress,
        "quiz_trend": quiz_trend,
        "topic_progress": topic_progress,
        "skill_radar": skill_data,
    }
