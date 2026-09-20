"""Learning path router — topic-by-topic learning, 30+ quiz generation, and remedial loops."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import (
    User, StudentProfile, LearningPath, LearningPathItem,
    StudentSkill, Skill, Quiz, Question, QuizAttempt
)
from app.routers.auth import get_current_user
from app.services.gemini_service import (
    generate_learning_path,
    generate_topic_content,
    generate_topic_quiz_30,
    generate_quiz_from_study_material,
    generate_topic_content_and_quiz,
    generate_remedial_content,
)

router = APIRouter(prefix="/learning-path", tags=["learning-path"])


@router.post("/generate")
async def generate_path(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate an AI personalized learning path outline.
    RULE: Never generates the entire course content or quizzes at once!
    Only creates the sequential topic roadmap. Topic 0 is 'available', all others are 'locked'.
    """
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()

    if not profile or not profile.career_goal:
        raise HTTPException(
            status_code=400,
            detail="Please complete your profile and career goal before generating a learning path."
        )

    career_goal = profile.career_goal
    current_skills = profile.programming_languages or []

    # Retrieve authentic weak skills assessed by AI
    skills_query = await db.execute(
        select(StudentSkill, Skill)
        .join(Skill, StudentSkill.skill_id == Skill.id)
        .where(StudentSkill.profile_id == profile.id, StudentSkill.level < 60)
    )
    weak_skills = [s.name for _, s in skills_query.all()]
    daily_minutes = profile.daily_learning_minutes or 60
    learning_style = profile.learning_style or "mixed"

    # Generate sequential outline via Gemini
    path_items = await generate_learning_path(
        career_goal, current_skills, weak_skills, daily_minutes, learning_style
    )

    # Delete existing path if any
    existing_path = await db.execute(
        select(LearningPath).where(LearningPath.user_id == current_user.id)
    )
    existing = existing_path.scalar_one_or_none()
    if existing:
        items_result = await db.execute(
            select(LearningPathItem).where(LearningPathItem.path_id == existing.id)
        )
        for item in items_result.scalars().all():
            await db.delete(item)
        await db.delete(existing)
        await db.flush()

    # Create new learning path
    path_id = str(uuid.uuid4())
    path = LearningPath(
        id=path_id,
        user_id=current_user.id,
        career_goal=career_goal,
        generated_by_ai=True,
        ai_summary=f"Personalized roadmap for becoming a {career_goal}",
        created_at=datetime.utcnow(),
    )
    db.add(path)

    items = []
    for idx, item_data in enumerate(path_items):
        item_status = "available" if idx == 0 else "locked"
        item = LearningPathItem(
            id=str(uuid.uuid4()),
            path_id=path_id,
            topic_name=item_data.get("topic_name", f"Topic {idx + 1}"),
            topic_description=item_data.get("topic_description", ""),
            difficulty=item_data.get("difficulty", "beginner"),
            estimated_hours=item_data.get("estimated_hours", 10),
            status=item_status,
            order_index=idx,
            resources_json=item_data.get("resources_json", []),
            detailed_content=None,
            sources_json=[],
            content_studied=False,
            remedial_content=None,
            analysis_json=None,
            quiz_id=None,
            created_at=datetime.utcnow(),
        )
        db.add(item)
        items.append({
            "id": item.id,
            "topic_name": item.topic_name,
            "topic_description": item.topic_description,
            "difficulty": item.difficulty,
            "estimated_hours": item.estimated_hours,
            "status": item.status,
            "order_index": idx,
            "resources": item.resources_json or [],
            "content_studied": False,
            "has_content": False,
            "has_remedial": False,
        })

    await db.commit()

    return {
        "path_id": path_id,
        "career_goal": career_goal,
        "items": items,
        "ai_summary": f"Personalized path for becoming a {career_goal}",
        "message": "Learning path roadmap created. Start with Topic 1 to generate detailed learning material.",
    }


@router.get("")
async def get_learning_path(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current learning path with granular topic status."""
    path_result = await db.execute(
        select(LearningPath).where(LearningPath.user_id == current_user.id)
    )
    path = path_result.scalar_one_or_none()

    if not path:
        return {"path": None, "items": [], "message": "No learning path found. Generate one first."}

    items_result = await db.execute(
        select(LearningPathItem)
        .where(LearningPathItem.path_id == path.id)
        .order_by(LearningPathItem.order_index)
    )
    items = items_result.scalars().all()

    return {
        "path": {
            "id": path.id,
            "career_goal": path.career_goal,
            "ai_summary": path.ai_summary,
            "created_at": path.created_at.isoformat() if path.created_at else None,
        },
        "items": [
            {
                "id": item.id,
                "topic_name": item.topic_name,
                "topic_description": item.topic_description,
                "difficulty": item.difficulty,
                "estimated_hours": item.estimated_hours,
                "status": item.status,
                "order_index": item.order_index,
                "resources": item.resources_json or [],
                "quiz_id": item.quiz_id,
                "content_studied": bool(item.content_studied),
                "has_content": bool(item.detailed_content),
                "has_remedial": bool(item.remedial_content),
                "analysis": item.analysis_json,
                "completed_at": item.completed_at.isoformat() if item.completed_at else None,
            }
            for item in items
        ],
    }


@router.get("/items/{item_id}/content")
async def get_topic_content(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get or dynamically generate detailed, university-grade learning content for a specific topic.
    Includes all 16 required sections and clearly separated official & academic sources.
    Enforces that locked topics cannot generate content ahead of time.
    """
    item_res = await db.execute(select(LearningPathItem).where(LearningPathItem.id == item_id))
    item = item_res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Topic not found")

    if item.status == "locked":
        raise HTTPException(
            status_code=403,
            detail="This topic is locked. You must complete previous topics and pass their diagnostic quizzes first."
        )

    # If content AND quiz are already generated, return cached content and quiz immediately
    if item.detailed_content and item.quiz_id:
        quiz_res = await db.execute(select(Quiz).where(Quiz.id == item.quiz_id))
        cached_quiz = quiz_res.scalar_one_or_none()
        if cached_quiz:
            qs_res = await db.execute(
                select(Question).where(Question.quiz_id == cached_quiz.id).order_by(Question.order_index)
            )
            cached_qs = qs_res.scalars().all()
            if len(cached_qs) >= 25:
                return {
                    "item_id": item.id,
                    "topic_name": item.topic_name,
                    "difficulty": item.difficulty,
                    "status": item.status,
                    "content": item.detailed_content,
                    "sources": item.sources_json or [],
                    "content_studied": bool(item.content_studied),
                    "remedial_content": item.remedial_content,
                    "analysis": item.analysis_json,
                    "quiz_id": item.quiz_id,
                    "quiz": {
                        "quiz_id": cached_quiz.id,
                        "topic": cached_quiz.topic_name,
                        "difficulty": cached_quiz.difficulty,
                        "time_limit_minutes": cached_quiz.time_limit_minutes or 25,
                        "total_questions": len(cached_qs),
                        "questions": [
                            {
                                "id": str(i),
                                "db_id": q.id,
                                "text": q.text,
                                "type": q.type or "mcq",
                                "options": q.options or [],
                                "concept_tag": q.concept_tag or item.topic_name,
                                "difficulty": q.difficulty or item.difficulty,
                                "hint": q.hint,
                            }
                            for i, q in enumerate(cached_qs)
                        ],
                    },
                }

    # Retrieve student context for tailored depth
    prof_res = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = prof_res.scalar_one_or_none()
    career_goal = profile.career_goal if profile and profile.career_goal else ""
    skill_level = profile.current_skill_level if profile and profile.current_skill_level else "beginner"

    try:
        if not item.detailed_content:
            # Generate study material and quiz AT THE SAME TIME, with quiz strictly derived from study material
            content_data, questions_data = await generate_topic_content_and_quiz(
                topic_name=item.topic_name,
                difficulty=item.difficulty or "intermediate",
                career_goal=career_goal,
                learner_level=skill_level,
                quiz_count=30,
            )
            item.detailed_content = content_data
            item.sources_json = content_data.get("sources_and_references", [])
        else:
            # Content already exists, generate quiz strictly according to existing study material
            content_data = item.detailed_content
            questions_data = await generate_quiz_from_study_material(
                topic_name=item.topic_name,
                difficulty=item.difficulty or "intermediate",
                study_material=content_data,
                count=30,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate study material and quiz: {str(e)}")

    # Create Quiz and Question records simultaneously
    quiz_id = str(uuid.uuid4())
    quiz = Quiz(
        id=quiz_id,
        topic_name=item.topic_name,
        generated_by_ai=True,
        difficulty=item.difficulty or "intermediate",
        time_limit_minutes=25,
        created_at=datetime.utcnow(),
    )
    db.add(quiz)

    formatted_questions = []
    for idx, q in enumerate(questions_data):
        question = Question(
            id=str(uuid.uuid4()),
            quiz_id=quiz_id,
            text=q.get("text", ""),
            type=q.get("type", "mcq"),
            options=q.get("options", []),
            correct_answer=q.get("correct_answer", ""),
            explanation=q.get("explanation", ""),
            topic_tag=item.topic_name,
            concept_tag=q.get("concept_tag", f"{item.topic_name} Core"),
            hint=q.get("hint", "Review the core principles discussed in the reading material."),
            difficulty=q.get("difficulty", item.difficulty or "intermediate"),
            order_index=idx,
        )
        db.add(question)
        formatted_questions.append({
            "id": str(idx),
            "db_id": question.id,
            "text": question.text,
            "type": question.type,
            "options": question.options,
            "concept_tag": question.concept_tag,
            "difficulty": question.difficulty,
            "hint": question.hint,
        })

    item.quiz_id = quiz_id
    if item.status == "available":
        item.status = "in_progress"

    await db.commit()

    return {
        "item_id": item.id,
        "topic_name": item.topic_name,
        "difficulty": item.difficulty,
        "status": item.status,
        "content": item.detailed_content,
        "sources": item.sources_json or [],
        "content_studied": bool(item.content_studied),
        "remedial_content": item.remedial_content,
        "analysis": item.analysis_json,
        "quiz_id": item.quiz_id,
        "quiz": {
            "quiz_id": quiz_id,
            "topic": item.topic_name,
            "difficulty": item.difficulty,
            "time_limit_minutes": 25,
            "total_questions": len(formatted_questions),
            "questions": formatted_questions,
        },
    }


@router.post("/items/{item_id}/study-complete")
async def mark_study_complete(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark that learner has studied the in-depth content, unlocking the 30-question diagnostic quiz."""
    item_res = await db.execute(select(LearningPathItem).where(LearningPathItem.id == item_id))
    item = item_res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Topic not found")

    if item.status == "locked":
        raise HTTPException(status_code=403, detail="Topic is locked.")

    item.content_studied = True
    if item.status == "available":
        item.status = "in_progress"
    await db.commit()

    return {
        "message": "Topic study verified. The 30-question diagnostic quiz is now unlocked!",
        "content_studied": True,
        "status": item.status,
    }


@router.get("/items/{item_id}/quiz")
async def get_item_quiz(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get or dynamically generate 30+ comprehensive diagnostic questions for this topic.
    Covers diverse question types, concept tags, hints, and difficulty ratings.
    """
    item_res = await db.execute(select(LearningPathItem).where(LearningPathItem.id == item_id))
    item = item_res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Topic not found")

    if item.status == "locked":
        raise HTTPException(
            status_code=403,
            detail="Topic is locked. You must complete previous topics and pass their quizzes first."
        )

    quiz = None
    questions = []

    if item.quiz_id:
        q_res = await db.execute(select(Quiz).where(Quiz.id == item.quiz_id))
        quiz = q_res.scalar_one_or_none()
        if quiz:
            questions_res = await db.execute(
                select(Question).where(Question.quiz_id == quiz.id).order_by(Question.order_index)
            )
            questions = questions_res.scalars().all()

    # If quiz doesn't exist or has fewer than 25 questions, generate according to study material
    if not quiz or len(questions) < 25:
        prof_res = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        profile = prof_res.scalar_one_or_none()
        career_goal = profile.career_goal if profile and profile.career_goal else ""
        skill_level = profile.current_skill_level if profile and profile.current_skill_level else "beginner"

        try:
            if not item.detailed_content:
                # Generate both study material and quiz simultaneously!
                content_data, questions_data = await generate_topic_content_and_quiz(
                    topic_name=item.topic_name,
                    difficulty=item.difficulty or "intermediate",
                    career_goal=career_goal,
                    learner_level=skill_level,
                    quiz_count=30,
                )
                item.detailed_content = content_data
                item.sources_json = content_data.get("sources_and_references", [])
            else:
                # Generate quiz strictly according to existing study material!
                questions_data = await generate_quiz_from_study_material(
                    topic_name=item.topic_name,
                    difficulty=item.difficulty or "intermediate",
                    study_material=item.detailed_content,
                    count=30,
                )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate 30-question quiz: {str(e)}")

        quiz_id = str(uuid.uuid4())
        quiz = Quiz(
            id=quiz_id,
            topic_name=item.topic_name,
            generated_by_ai=True,
            difficulty=item.difficulty or "intermediate",
            time_limit_minutes=25,
            created_at=datetime.utcnow(),
        )
        db.add(quiz)

        questions = []
        for idx, q in enumerate(questions_data):
            question = Question(
                id=str(uuid.uuid4()),
                quiz_id=quiz_id,
                text=q.get("text", ""),
                type=q.get("type", "mcq"),
                options=q.get("options", []),
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", ""),
                topic_tag=item.topic_name,
                concept_tag=q.get("concept_tag", f"{item.topic_name} Core"),
                hint=q.get("hint", "Review the core principles discussed in the reading material."),
                difficulty=q.get("difficulty", item.difficulty or "intermediate"),
                order_index=idx,
            )
            db.add(question)
            questions.append(question)

        item.quiz_id = quiz_id
        await db.commit()

    return {
        "quiz_id": quiz.id,
        "topic": item.topic_name,
        "difficulty": item.difficulty,
        "time_limit_minutes": quiz.time_limit_minutes or 25,
        "total_questions": len(questions),
        "questions": [
            {
                "id": str(i),
                "text": q.text,
                "type": q.type or "mcq",
                "options": q.options or [],
                "concept_tag": q.concept_tag or item.topic_name,
                "difficulty": q.difficulty or item.difficulty,
                "hint": q.hint,
            }
            for i, q in enumerate(questions)
        ],
    }


@router.get("/items/{item_id}/remedial")
async def get_item_remedial(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve remedial content and targeted practice questions for this topic."""
    item_res = await db.execute(select(LearningPathItem).where(LearningPathItem.id == item_id))
    item = item_res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Topic not found")

    return {
        "item_id": item.id,
        "topic_name": item.topic_name,
        "remedial_content": item.remedial_content,
        "analysis": item.analysis_json,
    }


class UpdateProgressRequest(BaseModel):
    item_id: str
    status: str  # in_progress, completed


@router.put("/progress")
async def update_progress(
    req: UpdateProgressRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update topic progress.
    Completion strictly requires passing the 30-question diagnostic quiz with >= 70%.
    """
    item_result = await db.execute(
        select(LearningPathItem).where(LearningPathItem.id == req.item_id)
    )
    item = item_result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Learning path item not found")

    if req.status == "completed":
        # Check if user has passed the quiz
        if not item.quiz_id:
            raise HTTPException(
                status_code=400,
                detail="You must take and pass the 30-question topic quiz with at least 70% to complete this topic."
            )

        qa_res = await db.execute(
            select(QuizAttempt)
            .where(
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.quiz_id == item.quiz_id
            )
            .order_by(QuizAttempt.completed_at.desc())
        )
        latest_attempt = qa_res.scalars().first()
        if not latest_attempt or latest_attempt.score < 70:
            raise HTTPException(
                status_code=400,
                detail="Topic quiz score is below 70%. Complete the remedial revision and achieve >= 70% to advance."
            )

        item.completed_at = datetime.utcnow()
        # Unlock next topic
        next_result = await db.execute(
            select(LearningPathItem)
            .where(
                LearningPathItem.path_id == item.path_id,
                LearningPathItem.order_index == item.order_index + 1
            )
        )
        next_item = next_result.scalar_one_or_none()
        if next_item and next_item.status == "locked":
            next_item.status = "available"

    item.status = req.status
    await db.commit()

    # Overall progress
    all_items_result = await db.execute(
        select(LearningPathItem).where(LearningPathItem.path_id == item.path_id)
    )
    all_items = all_items_result.scalars().all()
    completed_count = sum(1 for i in all_items if i.status == "completed")
    overall_progress = (completed_count / len(all_items)) * 100 if all_items else 0

    return {
        "message": f"Topic marked as {req.status}",
        "overall_progress": overall_progress,
    }


@router.get("/progress-model")
async def get_progress_model(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Return learning trail progress model with authentic student data."""
    profile_res = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = profile_res.scalar_one_or_none()
    career_goal = (profile.career_goal if profile and profile.career_goal else "Career Goal").strip()

    path_res = await db.execute(
        select(LearningPath).where(LearningPath.user_id == current_user.id)
    )
    path = path_res.scalar_one_or_none()

    if not path:
        return {
            "topics": [],
            "progress": 0.0,
            "message": "Complete your diagnostic assessment to generate your personalized learning roadmap."
        }

    items_res = await db.execute(
        select(LearningPathItem)
        .where(LearningPathItem.path_id == path.id)
        .order_by(LearningPathItem.order_index)
    )
    db_items = items_res.scalars().all()

    if not db_items:
        return {
            "topics": [],
            "progress": 0.0,
            "message": "Learning path items not yet populated."
        }

    topics = []
    completed_count = 0
    active_found = False

    for idx, item in enumerate(db_items[:8]):
        is_done = item.status == "completed"
        if is_done:
            completed_count += 1
        elif item.status in ("in_progress", "available") and not active_found:
            active_found = True

        actual_score = None
        if item.quiz_id:
            qa_res = await db.execute(
                select(QuizAttempt)
                .where(
                    QuizAttempt.user_id == current_user.id,
                    QuizAttempt.quiz_id == item.quiz_id
                )
                .order_by(QuizAttempt.completed_at.desc())
            )
            latest_qa = qa_res.scalars().first()
            if latest_qa:
                actual_score = round(latest_qa.score)

        topics.append({
            "id": item.id,
            "name": item.topic_name,
            "status": item.status,
            "quizScore": actual_score,
            "contentStudied": bool(item.content_studied),
            "lesson": {
                "title": f"Mastering {item.topic_name}",
                "minutes": int(item.estimated_hours * 60) if item.estimated_hours else 45,
                "problems": 30,
            },
            "reason": f"AI selected this topic for your {career_goal} roadmap.",
        })

    progress_val = float(completed_count) + (0.5 if active_found else 0.0)
    return {
        "topics": topics,
        "progress": round(progress_val, 2),
    }
