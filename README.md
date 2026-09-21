# 🎓 Smart Learning Path & Recommendation System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0-4285F4.svg?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Visuals-black.svg?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An intelligent, full-stack educational platform that delivers hyper-personalized learning journeys, AI diagnostic assessments, dynamic skill gap analysis, interactive 3D visualizations, and an ultra-low latency real-time voice assistant powered by **Google Gemini**.

---

## 🌟 Key Features

### 🧠 1. AI-Powered Dynamic Learning Paths
- Automatically generates structured, step-by-step modular learning curricula customized to student goals, skill level, and pace.
- Real-time progress tracking across modules, subtopics, and prerequisites.
- Topic status management (Not Started, In Progress, Completed).

### 🎯 2. Diagnostic Assessment & Skill Gap Analysis
- Initial diagnostic questionnaires to evaluate student proficiency levels.
- AI-driven skill gap identification highlighting areas that need reinforcement.
- Dynamic scoring with targeted remediation recommendations.

### 🎙️ 3. Real-Time AI Voice Assistant (Gemini Live)
- Bi-directional, real-time voice interaction with an AI tutor via WebSockets.
- Voice-activated learning, audio explanations, and natural conversational cadence.
- Audio visualization and reactive UI states during voice sessions.

### 🌐 4. Interactive 3D Visualizations
- Immersive 3D skill network and learning galaxy powered by **Three.js** and **React Three Fiber (@react-three/fiber, @react-three/drei)**.
- Visual node navigation connecting interconnected skills and progress milestones.

### 📝 5. Automated AI Quiz Engine
- Generates context-aware, topic-specific quizzes with multiple question types.
- Instant automated grading with detailed rationales for correct/incorrect choices.
- Adaptive difficulty based on student performance.

### 💬 6. Intelligent AI Tutor
- Contextual chat assistant capable of answering technical questions, breaking down complex concepts, and debugging code.
- Rich formatting with Markdown rendering and syntax-highlighted code snippets.

### 📊 7. Analytics & Performance Tracking
- Deep learning analytics powered by **Recharts**.
- Visualizations for study hours, quiz accuracy, completion velocity, and skill mastery.

### 🛡️ 8. Comprehensive Admin & Management Portal
- Administrative interface for student monitoring, course catalog management, and skill taxonomy configuration.
- Secure role-based access control (Student vs. Admin).

---

## 🏗️ Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React 19 + Vite SPA     │
                          │   (Three.js, Zustand)     │
                          └─────────────┬─────────────┘
                                        │
                         REST API & WebSockets (Voice)
                                        │
                          ┌─────────────▼─────────────┐
                          │     FastAPI Backend       │
                          │   (Async Python 3.14)     │
                          └──────┬─────────────┬──────┘
                                 │             │
                ┌────────────────┴─┐         ┌─┴────────────────┐
                │  Google Gemini   │         │  SQLite Database │
                │  Generative AI   │         │   (aiosqlite)    │
                └──────────────────┘         └──────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Routing**: [React Router DOM v7](https://reactrouter.com/)
- **3D Graphics**: [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei)
- **Charts & Data Viz**: [Recharts](https://recharts.org/)
- **UI & Animations**: [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/), [React Hot Toast](https://react-hot-toast.com/)
- **Markdown & Code**: [React Markdown](https://github.com/remarkjs/react-markdown), [React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous ASGI)
- **Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database / ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) with [aiosqlite](https://github.com/omnilib/aiosqlite) (SQLite / Supabase Postgres compatible)
- **AI Integration**: [Google GenAI SDK](https://github.com/google/generative-ai-python) (`google-genai`)
- **Authentication**: JWT tokens via [python-jose](https://github.com/mpdavis/python-jose) and password hashing with [bcrypt](https://github.com/pyca/bcrypt)
- **Real-Time Communication**: [WebSockets](https://websockets.readthedocs.io/) for live voice sessions

---

## 📁 Project Structure

```text
smart-learning-path-and-recommendation-system/
├── backend/
│   ├── app/
│   │   ├── routers/            # API Route handlers (auth, quiz, voice, tutor, etc.)
│   │   │   ├── admin.py
│   │   │   ├── ai_chat.py
│   │   │   ├── analytics.py
│   │   │   ├── assessment.py
│   │   │   ├── auth.py
│   │   │   ├── learning_path.py
│   │   │   ├── quiz.py
│   │   │   ├── student.py
│   │   │   └── voice.py
│   │   ├── services/           # External service handlers (Gemini AI client)
│   │   │   └── gemini_service.py
│   │   ├── auth_utils.py       # JWT & password security utilities
│   │   ├── config.py           # Pydantic environment configuration
│   │   ├── database.py         # Async database session & engine
│   │   ├── main.py             # FastAPI entrypoint & middleware
│   │   └── models.py           # SQLAlchemy database schemas & tables
│   ├── tests/                  # Unit and integration tests
│   ├── .env.example            # Sample environment variables
│   ├── requirements.txt        # Python backend dependencies
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI, 3D, and voice components
│   │   │   ├── 3d/             # Three.js 3D learning galaxies
│   │   │   ├── dashboard/      # Dashboard widgets and cards
│   │   │   ├── ui/             # Buttons, inputs, modals
│   │   │   └── voice/          # Real-time Voice Assistant modal
│   │   ├── pages/              # Application views & pages
│   │   │   ├── AdminPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── AssessmentPage.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LearningPathPage.jsx
│   │   │   ├── OnboardingPage.jsx
│   │   │   ├── QuizPage.jsx
│   │   │   └── TutorPage.jsx
│   │   ├── store/              # Zustand global state stores
│   │   ├── services/           # Axios HTTP and WebSocket service helpers
│   │   ├── App.jsx             # Route definitions and provider setup
│   │   └── main.jsx            # React root mount
│   ├── .env.example            # Sample frontend environment config
│   ├── package.json            # Node dependencies and scripts
│   └── vite.config.js          # Vite build config
│
├── .gitignore                  # Git exclusions (credentials, databases, packages)
└── README.md                   # Repository documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js 18+** and **npm**
- **Google Gemini API Key**: [Get a free API key from Google AI Studio](https://aistudio.google.com/apikey)

---

### 1. Backend Setup

1. Open your terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure backend environment variables:
   ```bash
   # Copy the example file
   cp .env.example .env      # macOS / Linux
   copy .env.example .env    # Windows CMD / PowerShell
   ```

5. Open `.env` and set your configuration:
   ```ini
   GEMINI_API_KEY=your_actual_gemini_api_key
   SECRET_KEY=generate_a_random_32_character_hex_key
   DATABASE_URL=sqlite+aiosqlite:///./smartlearn.db
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend API will be available at [http://localhost:8000](http://localhost:8000) and Swagger API docs at [http://localhost:8000/docs](http://localhost:8000/docs).*

---

### 2. Frontend Setup

1. In a new terminal window, navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Create the frontend environment configuration:
   ```bash
   cp .env.example .env      # macOS / Linux
   copy .env.example .env    # Windows CMD / PowerShell
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The web application will launch at [http://localhost:5173](http://localhost:5173).*

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user account |
| `POST` | `/auth/login` | Authenticate and obtain JWT bearer token |
| `GET` | `/auth/me` | Retrieve profile of authenticated user |
| `POST` | `/assessment/start` | Start an AI-tailored diagnostic assessment |
| `POST` | `/assessment/submit` | Submit answers and obtain skill gap analysis |
| `POST` | `/learning-path/generate` | Generate a personalized learning path with Gemini |
| `GET` | `/learning-path` | Fetch active learning path and modules |
| `PUT` | `/learning-path/progress` | Update completion state for learning topics |
| `POST` | `/quiz/generate` | Generate dynamic quizzes for a target topic |
| `POST` | `/quiz/submit` | Grade submitted quiz answers and return explanations |
| `POST` | `/ai/chat` | Contextual conversation with AI Tutor |
| `WS` | `/voice/session` | Real-time bi-directional audio voice session |
| `GET` | `/analytics` | Retrieve study metrics, hours, and mastery trends |
| `GET` | `/admin/students` | Administrator view of student performance |

---

## 🔒 Security & Environment Notes

- **Never commit `.env` files**: All secret keys, JWT tokens, and Gemini API keys are excluded by `.gitignore`.
- Always generate a fresh `SECRET_KEY` for production deployments using:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

---

## 🤝 Contributing

Contributions, issues, and feature suggestions are welcome!
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
