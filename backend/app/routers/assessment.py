"""Assessment router — generate and submit assessments dynamically with Gemini 3.1 Flash Lite."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional, Dict

from app.database import get_db
from app.models import (
    User, StudentProfile, Quiz, Question, QuizAttempt,
    StudentSkill, Skill, LearningPath, LearningPathItem
)
from app.routers.auth import get_current_user
from app.services.gemini_service import (
    generate_questions, analyze_skill_gap, generate_learning_path
)

router = APIRouter(prefix="/assessment", tags=["assessment"])


class StartAssessmentRequest(BaseModel):
    career_goal: Optional[str] = None
    skill_level: Optional[str] = None
    topics: Optional[List[str]] = None
    question_count: Optional[int] = 10


@router.post("/start")
async def start_assessment(
    req: Optional[StartAssessmentRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dynamically generate a new skill assessment tailored to the student."""
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    career_goal = (req.career_goal.strip() if req and req.career_goal else None) or (profile.career_goal if profile and profile.career_goal else None)
    if not career_goal:
        career_goal = "Software Engineer"

    # Ensure profile exists and sync dynamic goal / skill level
    if not profile:
        profile = StudentProfile(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            career_goal=career_goal,
            current_skill_level=req.skill_level if req and req.skill_level else "beginner",
            interests=req.topics if req and req.topics else [],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(profile)
        await db.flush()
    else:
        if req and req.career_goal and req.career_goal.strip():
            profile.career_goal = req.career_goal.strip()
        if req and req.skill_level and req.skill_level.strip():
            profile.current_skill_level = req.skill_level.strip()
        if req and req.topics:
            existing = profile.interests or []
            combined = list(dict.fromkeys(existing + [t.strip() for t in req.topics if t and t.strip()]))
            profile.interests = combined
        profile.updated_at = datetime.utcnow()

    current_level = (req.skill_level.strip() if req and req.skill_level else None) or (profile.current_skill_level or "beginner")

    # Dynamic topics: use requested topics or profile interests / languages
    topics = [t.strip() for t in (req.topics or []) if t and t.strip()] if req and req.topics else []
    if not topics:
        topics = [t.strip() for t in ((profile.interests or []) + (profile.programming_languages or [])) if t and t.strip()]

    question_count = req.question_count if req and req.question_count else 10
    question_count = min(max(question_count, 3), 20)
    time_limit_minutes = max(5, question_count * 2)

    # Generate questions dynamically via Gemini 3.1 Flash Lite
    try:
        questions = await generate_questions(career_goal, current_level, topics, count=question_count)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate assessment with AI: {str(e)}"
        )

    # Save quiz to database
    quiz_id = str(uuid.uuid4())
    quiz = Quiz(
        id=quiz_id,
        topic_name=f"{career_goal} Dynamic Assessment",
        generated_by_ai=True,
        difficulty=current_level,
        time_limit_minutes=time_limit_minutes,
        created_at=datetime.utcnow(),
    )
    db.add(quiz)

    for i, q in enumerate(questions):
        question = Question(
            id=str(uuid.uuid4()),
            quiz_id=quiz_id,
            text=q.get("text", ""),
            type=q.get("type", "mcq"),
            options=q.get("options", []),
            correct_answer=q.get("correct_answer", ""),
            explanation=q.get("explanation", ""),
            topic_tag=q.get("topic_tag", "Core Concepts"),
            difficulty=q.get("difficulty", current_level),
            order_index=i,
        )
        db.add(question)

    await db.commit()

    return {
        "quiz_id": quiz_id,
        "career_goal": career_goal,
        "difficulty": current_level,
        "questions": [
            {
                "id": str(i),
                "text": q.get("text", ""),
                "type": q.get("type", "mcq"),
                "options": q.get("options", []),
                "topic_tag": q.get("topic_tag", "Core Concepts"),
                "difficulty": q.get("difficulty", current_level),
            }
            for i, q in enumerate(questions)
        ],
        "time_limit_minutes": time_limit_minutes,
    }


class SubmitAssessmentRequest(BaseModel):
    quiz_id: str
    answers: Dict[str, str]  # {question_index: selected_answer}
    time_taken_seconds: int


@router.post("/submit")
async def submit_assessment(
    req: SubmitAssessmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit assessment, run AI skill gap analysis, and generate personalized learning path."""
    # Get quiz questions
    result = await db.execute(
        select(Question).where(Question.quiz_id == req.quiz_id).order_by(Question.order_index)
    )
    questions = result.scalars().all()

    if not questions:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Score the answers
    correct = 0
    topic_correct = {}
    topic_total = {}

    for i, question in enumerate(questions):
        key = str(i)
        user_answer = req.answers.get(key, "")
        is_correct = user_answer.strip().lower() == question.correct_answer.strip().lower()
        if is_correct:
            correct += 1

        tag = question.topic_tag or "General"
        topic_total[tag] = topic_total.get(tag, 0) + 1
        if is_correct:
            topic_correct[tag] = topic_correct.get(tag, 0) + 1

    score = (correct / len(questions)) * 100 if questions else 0
    accuracy = score

    topic_performance = {
        tag: (topic_correct.get(tag, 0) / total) * 100
        for tag, total in topic_total.items()
    }

    # Get student profile
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    current_skills = profile.programming_languages or []
    career_goal = profile.career_goal or "Software Engineer"

    # AI Skill Gap Analysis via Gemini 3.1 Flash Lite
    assessment_results = {
        "score": score,
        "correct": correct,
        "total": len(questions),
        "topic_performance": topic_performance,
        "time_taken_seconds": req.time_taken_seconds,
    }
    skill_gap = await analyze_skill_gap(career_goal, assessment_results, current_skills)

    # Persist dynamically assessed skills in database
    assessed_levels = skill_gap.get("skill_levels", {})
    for skill_name, level_val in assessed_levels.items():
        # Check if Skill model entry exists
        s_result = await db.execute(select(Skill).where(Skill.name == skill_name))
        skill_obj = s_result.scalar_one_or_none()
        if not skill_obj:
            skill_obj = Skill(
                id=str(uuid.uuid4()),
                name=skill_name,
                category=career_goal,
                description=f"Skill for {career_goal}",
            )
            db.add(skill_obj)
            await db.flush()

        # Check StudentSkill relation
        ss_result = await db.execute(
            select(StudentSkill).where(
                StudentSkill.profile_id == profile.id,
                StudentSkill.skill_id == skill_obj.id
            )
        )
        student_skill = ss_result.scalar_one_or_none()
        skill_status = "mastered" if level_val >= 80 else "learning" if level_val >= 40 else "gap"
        if student_skill:
            student_skill.level = float(level_val)
            student_skill.status = skill_status
            student_skill.last_assessed = datetime.utcnow()
        else:
            student_skill = StudentSkill(
                id=str(uuid.uuid4()),
                profile_id=profile.id,
                skill_id=skill_obj.id,
                level=float(level_val),
                status=skill_status,
                last_assessed=datetime.utcnow(),
            )
            db.add(student_skill)

    # Automatically generate dynamic Learning Path via Gemini 3.1 Flash Lite
    path_items_data = await generate_learning_path(
        career_goal=career_goal,
        current_skills=skill_gap.get("strong_skills", current_skills),
        weak_skills=skill_gap.get("weak_skills", []),
        daily_minutes=profile.daily_learning_minutes or 60,
        learning_style=profile.learning_style or "mixed",
    )

    # Delete previous learning path if any
    existing_path_res = await db.execute(
        select(LearningPath).where(LearningPath.user_id == current_user.id)
    )
    existing_path = existing_path_res.scalar_one_or_none()
    if existing_path:
        old_items_res = await db.execute(
            select(LearningPathItem).where(LearningPathItem.path_id == existing_path.id)
        )
        for old_item in old_items_res.scalars().all():
            await db.delete(old_item)
        await db.delete(existing_path)
        await db.flush()

    # Create new learning path
    new_path = LearningPath(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        career_goal=career_goal,
        generated_by_ai=True,
        ai_summary=skill_gap.get("ai_summary", f"Personalized learning path for {career_goal}"),
        created_at=datetime.utcnow(),
    )
    db.add(new_path)

    for item_data in path_items_data:
        quiz_id = None
        quiz_data = item_data.get("quiz")
        quiz_questions = quiz_data.get("questions", []) if isinstance(quiz_data, dict) else []

        if quiz_questions:
            quiz_id = str(uuid.uuid4())
            quiz = Quiz(
                id=quiz_id,
                topic_name=item_data.get("topic_name", ""),
                generated_by_ai=True,
                difficulty=item_data.get("difficulty", "beginner"),
                time_limit_minutes=10,
                created_at=datetime.utcnow(),
            )
            db.add(quiz)
            for q_idx, q in enumerate(quiz_questions):
                question = Question(
                    id=str(uuid.uuid4()),
                    quiz_id=quiz_id,
                    text=q.get("text", ""),
                    type="mcq",
                    options=q.get("options", []),
                    correct_answer=q.get("correct_answer", ""),
                    explanation=q.get("explanation", ""),
                    topic_tag=item_data.get("topic_name", ""),
                    difficulty=item_data.get("difficulty", "beginner"),
                    order_index=q_idx,
                )
                db.add(question)

        path_item = LearningPathItem(
            id=str(uuid.uuid4()),
            path_id=new_path.id,
            topic_name=item_data.get("topic_name", ""),
            topic_description=item_data.get("topic_description", ""),
            difficulty=item_data.get("difficulty", "beginner"),
            estimated_hours=item_data.get("estimated_hours", 10),
            status=item_data.get("status", "locked"),
            order_index=item_data.get("order_index", 0),
            resources_json=item_data.get("resources_json", []),
            quiz_id=quiz_id,
            created_at=datetime.utcnow(),
        )
        db.add(path_item)

    # Save quiz attempt record
    attempt = QuizAttempt(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        quiz_id=req.quiz_id,
        score=score,
        accuracy=accuracy,
        answers=req.answers,
        time_taken_seconds=req.time_taken_seconds,
        topic_performance=topic_performance,
        feedback=skill_gap.get("ai_summary", ""),
        completed_at=datetime.utcnow(),
    )
    db.add(attempt)

    # Update StudentProfile flags
    profile.assessment_completed = True
    profile.current_skill_level = "intermediate" if score >= 60 else "beginner"
    profile.updated_at = datetime.utcnow()

    await db.commit()

    return {
        "score": score,
        "accuracy": accuracy,
        "correct": correct,
        "total": len(questions),
        "topic_performance": topic_performance,
        "time_taken_seconds": req.time_taken_seconds,
        "skill_gap": skill_gap,
        "feedback": skill_gap.get("ai_summary", ""),
        "learning_path_generated": True,
    }
