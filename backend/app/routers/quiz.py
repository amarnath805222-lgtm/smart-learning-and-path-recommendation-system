"""Quiz router — 30-question diagnostic evaluation, concept-level analytics, adaptive progression, and remediation."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Dict, List, Optional

from app.database import get_db
from app.models import (
    User, StudentProfile, Quiz, Question, QuizAttempt,
    LearningPath, LearningPathItem, Progress, StudentSkill, Skill
)
from app.routers.auth import get_current_user
from app.services.gemini_service import (
    generate_quiz,
    generate_topic_quiz_30,
    generate_topic_content_and_quiz,
    generate_remedial_content,
)

router = APIRouter(prefix="/quiz", tags=["quiz"])


class GenerateQuizRequest(BaseModel):
    topic: str
    difficulty: str = "intermediate"
    count: int = 30


@router.post("/generate")
async def generate_topic_quiz_endpoint(
    req: GenerateQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dynamically generate comprehensive study material and diagnostic questions at the same time."""
    try:
        content_data, questions = await generate_topic_content_and_quiz(
            topic_name=req.topic,
            difficulty=req.difficulty,
            quiz_count=req.count if req.count else 30,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate study material and quiz: {str(e)}"
        )

    quiz_id = str(uuid.uuid4())
    quiz = Quiz(
        id=quiz_id,
        topic_name=req.topic,
        generated_by_ai=True,
        difficulty=req.difficulty,
        time_limit_minutes=25,
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
            topic_tag=req.topic,
            concept_tag=q.get("concept_tag", f"{req.topic} Core"),
            hint=q.get("hint", ""),
            difficulty=q.get("difficulty", req.difficulty),
            order_index=i,
        )
        db.add(question)

    await db.commit()

    return {
        "quiz_id": quiz_id,
        "topic": req.topic,
        "difficulty": req.difficulty,
        "time_limit_minutes": 25,
        "total_questions": len(questions),
        "study_material": content_data,
        "questions": [
            {
                "id": str(i),
                "text": q.get("text", ""),
                "type": q.get("type", "mcq"),
                "options": q.get("options", []),
                "concept_tag": q.get("concept_tag", req.topic),
                "difficulty": q.get("difficulty", req.difficulty),
                "hint": q.get("hint", ""),
            }
            for i, q in enumerate(questions)
        ],
    }


class SubmitQuizRequest(BaseModel):
    quiz_id: str
    answers: Dict[str, str]
    time_taken_seconds: int


@router.post("/submit")
async def submit_quiz(
    req: SubmitQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit quiz, execute granular concept-level performance analysis,
    diagnose misconceptions, and enforce completion / remedial revision loops.
    """
    quiz_res = await db.execute(select(Quiz).where(Quiz.id == req.quiz_id))
    quiz = quiz_res.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    result = await db.execute(
        select(Question).where(Question.quiz_id == req.quiz_id).order_by(Question.order_index)
    )
    questions = result.scalars().all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this quiz")

    total_questions = len(questions)
    correct_count = 0
    detailed_results = []

    # Difficulty tracking
    diff_stats = {
        "beginner": {"correct": 0, "total": 0},
        "intermediate": {"correct": 0, "total": 0},
        "advanced": {"correct": 0, "total": 0},
    }

    # Concept tracking
    concept_stats = {}
    misconceptions = []

    for i, question in enumerate(questions):
        key = str(i)
        user_answer = (req.answers.get(key) or "").strip()
        correct_ans = question.correct_answer.strip()
        is_correct = user_answer.lower() == correct_ans.lower()

        if is_correct:
            correct_count += 1

        # Difficulty tracking
        q_diff = (question.difficulty or "intermediate").lower()
        if q_diff not in diff_stats:
            diff_stats[q_diff] = {"correct": 0, "total": 0}
        diff_stats[q_diff]["total"] += 1
        if is_correct:
            diff_stats[q_diff]["correct"] += 1

        # Concept tracking
        c_tag = question.concept_tag or question.topic_tag or quiz.topic_name or "Core Principles"
        if c_tag not in concept_stats:
            concept_stats[c_tag] = {"correct": 0, "total": 0}
        concept_stats[c_tag]["total"] += 1
        if is_correct:
            concept_stats[c_tag]["correct"] += 1
        else:
            misconceptions.append(
                f"On '{c_tag}': chosen '{user_answer or 'No Answer'}' instead of '{correct_ans}'"
            )

        detailed_results.append({
            "question": question.text,
            "user_answer": user_answer,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "explanation": question.explanation,
            "concept_tag": c_tag,
            "difficulty": question.difficulty,
        })

    accuracy = (correct_count / total_questions) * 100 if total_questions else 0.0
    score = round(accuracy, 1)

    # Difficulty performance breakdown
    difficulty_performance = {}
    for d, data in diff_stats.items():
        if data["total"] > 0:
            pct = round((data["correct"] / data["total"]) * 100, 1)
            difficulty_performance[d] = {
                "correct": data["correct"],
                "total": data["total"],
                "pct": pct,
            }

    # Concept performance breakdown
    concept_performance = {}
    weak_concepts = []
    strong_concepts = []

    for c, data in concept_stats.items():
        pct = round((data["correct"] / data["total"]) * 100, 1)
        if pct >= 80:
            status = "Strong"
            strong_concepts.append(c)
        elif pct >= 60:
            status = "Medium"
        else:
            status = "Weak"
            weak_concepts.append(c)

        concept_performance[c] = {
            "correct": data["correct"],
            "total": data["total"],
            "score": pct,
            "status": status,
        }

    # Mastery criteria: >= 70%
    passed = score >= 70.0
    unlock_next = passed
    next_unlocked_topic = None
    remedial_content = None

    if passed:
        feedback = (
            f"🎉 Mastered! You scored {score}% ({correct_count}/{total_questions}). "
            f"You demonstrated strong command of {len(strong_concepts)} concept areas. Next topic unlocked!"
        )
    else:
        feedback = (
            f"Needs Review. You scored {score}% ({correct_count}/{total_questions}), which is below the 70% threshold. "
            f"We identified {len(weak_concepts)} weak concept areas. Targeted remedial explanations and practice questions have been prepared below."
        )

    # If failed, generate targeted remedial content for weak concepts
    if not passed:
        try:
            remedial_content = await generate_remedial_content(
                topic_name=quiz.topic_name,
                weak_concepts=weak_concepts,
                misconceptions=misconceptions[:6],
                quiz_score=score,
            )
        except Exception:
            remedial_content = {
                "remedial_summary": f"Review the weak areas in {quiz.topic_name} before retaking the quiz.",
                "concept_breakdowns": [
                    {"concept": wc, "core_explanation": f"Focus on understanding {wc} in detail."}
                    for wc in weak_concepts
                ],
                "practice_questions": [],
            }

    # Record Attempt in Database
    attempt = QuizAttempt(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        quiz_id=req.quiz_id,
        score=score,
        accuracy=score,
        answers=req.answers,
        time_taken_seconds=req.time_taken_seconds,
        topic_performance={quiz.topic_name: score},
        concept_performance=concept_performance,
        difficulty_performance=difficulty_performance,
        weak_concepts=weak_concepts,
        strong_concepts=strong_concepts,
        misconceptions=misconceptions[:10],
        passed=passed,
        feedback=feedback,
        completed_at=datetime.utcnow(),
    )
    db.add(attempt)

    # Update Learning Path Item Status
    path_res = await db.execute(
        select(LearningPath).where(LearningPath.user_id == current_user.id)
    )
    path = path_res.scalar_one_or_none()

    current_item = None
    if path:
        items_res = await db.execute(
            select(LearningPathItem)
            .where(LearningPathItem.path_id == path.id)
            .order_by(LearningPathItem.order_index)
        )
        items = items_res.scalars().all()

        for idx, item in enumerate(items):
            if (item.quiz_id == quiz.id) or (item.topic_name.strip().lower() == quiz.topic_name.strip().lower()):
                current_item = item
                # Save analysis cache on item
                item.analysis_json = {
                    "score": score,
                    "accuracy": score,
                    "correct": correct_count,
                    "total": total_questions,
                    "time_taken_seconds": req.time_taken_seconds,
                    "concept_performance": concept_performance,
                    "difficulty_performance": difficulty_performance,
                    "weak_concepts": weak_concepts,
                    "strong_concepts": strong_concepts,
                    "passed": passed,
                    "completed_at": datetime.utcnow().isoformat(),
                }

                if passed:
                    item.status = "completed"
                    item.completed_at = datetime.utcnow()
                    # Unlock NEXT topic only
                    if idx + 1 < len(items):
                        items[idx + 1].status = "available"
                        next_unlocked_topic = items[idx + 1].topic_name
                        # Adaptive difficulty adjustment: if score >= 85% and next is beginner, elevate
                        if score >= 85 and items[idx + 1].difficulty == "beginner":
                            items[idx + 1].difficulty = "intermediate"
                else:
                    item.status = "in_progress"
                    item.remedial_content = remedial_content
                    # Ensure next topic remains strictly locked
                    if idx + 1 < len(items):
                        items[idx + 1].status = "locked"
                break

    # Update Profile progress & total learning minutes
    prof_res = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == current_user.id)
    )
    profile = prof_res.scalar_one_or_none()
    minutes_spent = max(1, round(req.time_taken_seconds / 60))

    if profile:
        profile.total_learning_minutes = (profile.total_learning_minutes or 0) + minutes_spent
        if path:
            items_res = await db.execute(
                select(LearningPathItem).where(LearningPathItem.path_id == path.id)
            )
            all_items = items_res.scalars().all()
            completed_count = sum(1 for i in all_items if i.status == "completed")
            profile.overall_progress = (completed_count / len(all_items)) * 100 if all_items else 0
        profile.updated_at = datetime.utcnow()

    # Record Daily Progress
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    prog_res = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.date == today_str
        )
    )
    progress_rec = prog_res.scalar_one_or_none()
    if progress_rec:
        progress_rec.minutes_learned += minutes_spent
        progress_rec.quizzes_taken += 1
        progress_rec.quiz_avg_score = (progress_rec.quiz_avg_score + score) / 2
        progress_rec.overall_progress = profile.overall_progress if profile else 0
    else:
        progress_rec = Progress(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            date=today_str,
            minutes_learned=minutes_spent,
            quizzes_taken=1,
            quiz_avg_score=score,
            overall_progress=profile.overall_progress if profile else 0,
        )
        db.add(progress_rec)

    await db.commit()

    return {
        "score": score,
        "accuracy": score,
        "correct": correct_count,
        "total": total_questions,
        "time_taken_seconds": req.time_taken_seconds,
        "passed": passed,
        "unlock_next": unlock_next,
        "next_unlocked_topic": next_unlocked_topic,
        "difficulty_performance": difficulty_performance,
        "concept_performance": concept_performance,
        "weak_concepts": weak_concepts,
        "strong_concepts": strong_concepts,
        "feedback": feedback,
        "remedial_content": remedial_content,
        "detailed_results": detailed_results,
    }


@router.get("/history")
async def get_quiz_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get authenticated student's real quiz history."""
    result = await db.execute(
        select(QuizAttempt, Quiz)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.completed_at.desc())
    )
    attempts = []
    for attempt, quiz in result.all():
        attempts.append({
            "id": attempt.id,
            "topic": quiz.topic_name,
            "score": attempt.score,
            "accuracy": attempt.accuracy,
            "passed": getattr(attempt, "passed", attempt.score >= 70),
            "time_taken": attempt.time_taken_seconds,
            "concept_performance": getattr(attempt, "concept_performance", {}),
            "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
        })
    return {"attempts": attempts}
