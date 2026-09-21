"""SQLAlchemy models for Smart Learning Path."""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


def gen_uuid():
    return str(uuid.uuid4())


class EducationLevel(str, enum.Enum):
    HIGH_SCHOOL = "high_school"
    UNDERGRADUATE = "undergraduate"
    POSTGRADUATE = "postgraduate"
    PROFESSIONAL = "professional"


class LearningStyle(str, enum.Enum):
    VISUAL = "visual"
    READING = "reading"
    HANDS_ON = "hands_on"
    VIDEO = "video"
    MIXED = "mixed"


class SkillLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class TopicStatus(str, enum.Enum):
    LOCKED = "locked"
    AVAILABLE = "available"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# ─── USER ─────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # null for OAuth
    full_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    provider = Column(String, default="email")  # email, google
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="user", uselist=False)
    learning_path = relationship("LearningPath", back_populates="user", uselist=False)
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    progress_records = relationship("Progress", back_populates="user")
    recommendations = relationship("Recommendation", back_populates="user")


# ─── STUDENT PROFILE ──────────────────────────
class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    education_level = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    career_goal = Column(String, nullable=True)
    daily_learning_minutes = Column(Integer, default=60)
    learning_style = Column(String, default="mixed")
    programming_languages = Column(JSON, default=list)
    interests = Column(JSON, default=list)
    completed_courses = Column(JSON, default=list)
    current_skill_level = Column(String, default="beginner")
    onboarding_completed = Column(Boolean, default=False)
    assessment_completed = Column(Boolean, default=False)
    overall_progress = Column(Float, default=0.0)
    streak_days = Column(Integer, default=0)
    total_learning_minutes = Column(Integer, default=0)
    last_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")
    student_skills = relationship("StudentSkill", back_populates="profile")


# ─── SKILLS ───────────────────────────────────
class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False, unique=True)
    category = Column(String, nullable=False)  # programming, math, ml, etc.
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    color = Column(String, default="#6c63ff")
    difficulty = Column(String, default="beginner")
    prerequisites = Column(JSON, default=list)  # list of skill IDs
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student_skills = relationship("StudentSkill", back_populates="skill")


class StudentSkill(Base):
    __tablename__ = "student_skills"

    id = Column(String, primary_key=True, default=gen_uuid)
    profile_id = Column(String, ForeignKey("student_profiles.id"), nullable=False)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    level = Column(Float, default=0.0)  # 0–100
    status = Column(String, default="missing")  # strong, weak, missing
    last_assessed = Column(DateTime, default=datetime.utcnow)

    profile = relationship("StudentProfile", back_populates="student_skills")
    skill = relationship("Skill", back_populates="student_skills")


# ─── COURSES & RESOURCES ──────────────────────
class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=True)
    difficulty = Column(String, default="beginner")
    estimated_hours = Column(Float, default=5.0)
    icon = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    resources = relationship("Resource", back_populates="course")


class Resource(Base):
    __tablename__ = "resources"

    id = Column(String, primary_key=True, default=gen_uuid)
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=True)
    type = Column(String, default="article")  # video, article, docs, book, practice, project
    difficulty = Column(String, default="beginner")
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    is_free = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="resources")


# ─── LEARNING PATH ────────────────────────────
class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    career_goal = Column(String, nullable=True)
    generated_by_ai = Column(Boolean, default=True)
    ai_summary = Column(Text, nullable=True)
    is_adaptive = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="learning_path")
    items = relationship("LearningPathItem", back_populates="path", order_by="LearningPathItem.order_index")


class LearningPathItem(Base):
    __tablename__ = "learning_path_items"

    id = Column(String, primary_key=True, default=gen_uuid)
    path_id = Column(String, ForeignKey("learning_paths.id"), nullable=False)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=True)
    topic_name = Column(String, nullable=False)
    topic_description = Column(Text, nullable=True)
    difficulty = Column(String, default="beginner")
    estimated_hours = Column(Float, default=5.0)
    status = Column(String, default="locked")  # TopicStatus values
    order_index = Column(Integer, nullable=False)
    resources_json = Column(JSON, default=list)  # Embedded resource data
    detailed_content = Column(JSON, nullable=True)  # In-depth 16-section learning material
    sources_json = Column(JSON, default=list)  # Separated official & academic sources
    content_studied = Column(Boolean, default=False)  # Learner completed studying content
    remedial_content = Column(JSON, nullable=True)  # Targeted remedial content if quiz failed
    analysis_json = Column(JSON, nullable=True)  # Topic-level learning analysis
    quiz_id = Column(String, ForeignKey("quizzes.id"), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    path = relationship("LearningPath", back_populates="items")
    skill = relationship("Skill")


# ─── QUIZZES ──────────────────────────────────
class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(String, primary_key=True, default=gen_uuid)
    topic_name = Column(String, nullable=False)
    generated_by_ai = Column(Boolean, default=True)
    difficulty = Column(String, default="beginner")
    time_limit_minutes = Column(Integer, default=25)
    created_at = Column(DateTime, default=datetime.utcnow)

    questions = relationship("Question", back_populates="quiz")
    attempts = relationship("QuizAttempt", back_populates="quiz")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=gen_uuid)
    quiz_id = Column(String, ForeignKey("quizzes.id"), nullable=False)
    text = Column(Text, nullable=False)
    type = Column(String, default="mcq")  # mcq, multiple_choice, true_false, scenario, application
    options = Column(JSON, nullable=True)  # list of strings for MCQ
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    topic_tag = Column(String, nullable=True)
    concept_tag = Column(String, nullable=True)
    hint = Column(Text, nullable=True)
    difficulty = Column(String, default="beginner")
    order_index = Column(Integer, default=0)

    quiz = relationship("Quiz", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(String, ForeignKey("quizzes.id"), nullable=False)
    score = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    answers = Column(JSON, default=dict)  # {question_id: answer}
    time_taken_seconds = Column(Integer, default=0)
    topic_performance = Column(JSON, default=dict)  # {topic: score}
    concept_performance = Column(JSON, default=dict)  # {concept: {score, total, correct, status}}
    difficulty_performance = Column(JSON, default=dict)  # {beginner: %, intermediate: %, advanced: %}
    weak_concepts = Column(JSON, default=list)
    strong_concepts = Column(JSON, default=list)
    misconceptions = Column(JSON, default=list)
    passed = Column(Boolean, default=False)
    feedback = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")


# ─── PROGRESS ─────────────────────────────────
class Progress(Base):
    __tablename__ = "progress"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    minutes_learned = Column(Integer, default=0)
    topics_completed = Column(Integer, default=0)
    quizzes_taken = Column(Integer, default=0)
    quiz_avg_score = Column(Float, default=0.0)
    overall_progress = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="progress_records")


# ─── RECOMMENDATIONS ──────────────────────────
class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, default="topic")  # topic, resource, project, course
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    priority = Column(Integer, default=1)
    is_dismissed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recommendations")


# ─── PROJECTS ─────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=True)
    difficulty = Column(String, default="beginner")
    estimated_hours = Column(Float, default=10.0)
    required_skills = Column(JSON, default=list)
    tech_stack = Column(JSON, default=list)
    github_template = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
