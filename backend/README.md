# Smart Learning Path — Backend

## Quick Start

### 1. Set up environment
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your values:
```bash
copy .env.example .env
```

### 3. Run the backend
```bash
uvicorn app.main:app --reload --port 8000
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes (for AI features) |
| `SECRET_KEY` | JWT secret (generate with `openssl rand -hex 32`) | Yes |
| `DATABASE_URL` | SQLite: `sqlite+aiosqlite:///./smartlearn.db` | Yes |
| `CORS_ORIGINS` | Frontend URL (default: `http://localhost:5173`) | Yes |

### Optional (for Supabase migration later)
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

---

## API Endpoints

### Auth
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login, get JWT
- `GET  /auth/me` — Get current user

### Student
- `GET  /student/profile` — Get student profile
- `PUT  /student/profile` — Update profile

### Assessment
- `POST /assessment/start` — Generate AI assessment
- `POST /assessment/submit` — Submit answers, get analysis

### Skills & Learning
- `GET  /skills` — Get all skills
- `GET  /skill-gap` — Get student skill gap analysis
- `POST /learning-path/generate` — Generate AI learning path
- `GET  /learning-path` — Get current learning path
- `PUT  /learning-path/progress` — Update topic progress

### Quiz
- `POST /quiz/generate` — Generate quiz for topic
- `POST /quiz/submit` — Submit quiz, get results

### AI
- `POST /ai/chat` — Chat with AI tutor
- `WS   /voice/session` — Real-time voice session (Gemini Live)

### Analytics
- `GET  /analytics` — Get student analytics

### Admin
- `GET  /admin/students` — List all students
- `GET  /admin/courses` — List all courses
- `POST /admin/courses` — Add a course
- `PUT  /admin/courses/{id}` — Update course
- `GET  /admin/skills` — List all skills
- `POST /admin/skills` — Add a skill
