"""Smart Learning Path — FastAPI Backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.routers import auth, student, assessment, learning_path, quiz, ai_chat, analytics, admin, voice


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events."""
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Database: {settings.DATABASE_URL}")
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
        print("Gemini API configured")
    else:
        print("Warning: Gemini API key not set — AI features will use mock data")
    
    await init_db()
    print("Database initialized")
    
    yield
    
    print("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Personalized Learning & Career Guidance Platform",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(assessment.router)
app.include_router(learning_path.router)
app.include_router(quiz.router)
app.include_router(ai_chat.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(voice.router)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "gemini_configured": bool(
            settings.GEMINI_API_KEY and 
            settings.GEMINI_API_KEY != "your_gemini_api_key_here"
        ),
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "version": settings.APP_VERSION}
