import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, CheckCircle, XCircle, ChevronRight, Zap, BarChart2, RefreshCw } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { assessmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { Assessment3DCore } from '../components/3d/Section3DScenes';

function AnalyzingAnimation() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Assessment3DCore height={190} />
      </div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink, #12203A)', marginBottom: 8 }}>
        Analyzing your skills{'.'.repeat(dot + 1)}
      </h2>
      <p style={{ color: 'var(--muted, #56657F)', fontSize: '0.9rem' }}>
        AI is generating your personalized skill gap analysis
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
        {['Reading responses', 'Analyzing patterns', 'Generating insights'].map((step, i) => (
          <div key={i} style={{
            padding: '6px 12px', borderRadius: 20,
            background: dot >= i ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${dot >= i ? 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            fontSize: '0.75rem', color: dot >= i ? '#8b85ff' : '#404060',
            transition: 'all 0.4s',
          }}>
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsView({ results, onRetake }) {
  const navigate = useNavigate();
  const skillGap = results.skill_gap || {};
  const topicPerf = results.topic_performance || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Score hero */}
      <div style={{
        textAlign: 'center', padding: '24px 0',
        borderBottom: '1px solid var(--bdr, #E2E8F0)',
      }}>
        <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--ink, #0B1220)', fontFamily: 'JetBrains Mono, monospace' }}>
          {Math.round(results.score)}%
        </div>
        <div style={{ color: '#2F5BFF', fontWeight: 700, fontSize: '1.1rem', marginTop: 4 }}>
          {results.correct}/{results.total} Correct
        </div>
        <div style={{ color: 'var(--muted, #56657F)', fontSize: '0.85rem', marginTop: 8 }}>
          Time taken: {Math.floor(results.time_taken_seconds / 60)}m {results.time_taken_seconds % 60}s
        </div>
      </div>

      {/* Topic performance */}
      <div style={{ padding: '8px 0', borderBottom: '1px solid var(--bdr, #E2E8F0)' }}>
        <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 16, fontSize: '0.95rem' }}>Topic Performance</h3>
        {Object.entries(topicPerf).map(([topic, score]) => (
          <div key={topic} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted, #56657F)' }}>{topic}</span>
              <span style={{
                fontSize: '0.82rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444',
              }}>
                {Math.round(score)}%
              </span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{
                width: `${score}%`,
                background: score >= 70
                  ? '#10B981'
                  : score >= 40
                    ? '#F59E0B'
                    : '#EF4444',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* AI Feedback */}
      {results.feedback && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          borderLeft: '4px solid #2F5BFF',
          borderTop: '1px solid var(--bdr, #E2E8F0)',
          borderRight: '1px solid var(--bdr, #E2E8F0)',
          borderBottom: '1px solid var(--bdr, #E2E8F0)',
        }}>
          <div className="ai-badge" style={{ marginBottom: 8 }}>💡 AI Insight</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink, #0B1220)', lineHeight: 1.65 }}>{results.feedback}</p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-outline" onClick={onRetake} style={{ flex: 1 }}>
          <RefreshCw size={14} /> Retake
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/learning-path')} style={{ flex: 2 }}>
          <Zap size={14} /> Generate My Learning Path
        </button>
      </div>
    </div>
  );
}

const SUGGESTED_ROLES = [
  'Full Stack Developer',
  'Data Scientist',
  'AI/ML Engineer',
  'DevOps Engineer',
  'Cloud Architect',
  'Cybersecurity Specialist',
  'Mobile App Developer',
];

export default function AssessmentPage() {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useAuthStore();
  const [phase, setPhase] = useState('intro'); // intro | active | analyzing | results
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  // Dynamic configuration states
  const [careerGoal, setCareerGoal] = useState(profile?.profile?.career_goal || '');
  const [skillLevel, setSkillLevel] = useState(profile?.profile?.current_skill_level || 'beginner');
  const [customTopics, setCustomTopics] = useState(
    (profile?.profile?.interests || []).join(', ')
  );
  const [questionCount, setQuestionCount] = useState(10);

  // Sync with profile if loaded asynchronously
  useEffect(() => {
    if (profile?.profile?.career_goal && !careerGoal) {
      setCareerGoal(profile.profile.career_goal);
    }
    if (profile?.profile?.current_skill_level && skillLevel === 'beginner') {
      setSkillLevel(profile.profile.current_skill_level);
    }
    if (profile?.profile?.interests?.length && !customTopics) {
      setCustomTopics(profile.profile.interests.join(', '));
    }
  }, [profile]);

  // Timer
  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => setTimer((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startAssessment = async () => {
    const goalToUse = careerGoal.trim() || profile?.profile?.career_goal || 'Software Engineer';
    setLoading(true);
    try {
      const parsedTopics = customTopics
        ? customTopics.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await assessmentAPI.start({
        career_goal: goalToUse,
        skill_level: skillLevel,
        topics: parsedTopics,
        question_count: questionCount,
      });

      setQuiz(res.data);
      setCurrent(0);
      setAnswers({});
      setSelected(null);
      setStartTime(Date.now());
      setTimer(0);
      setPhase('active');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to start assessment. Is the backend running?';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (opt) => setSelected(opt);

  const handleNext = async () => {
    if (!selected) { toast.error('Please select an answer'); return; }
    const newAnswers = { ...answers, [String(current)]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 < quiz.questions.length) {
      setCurrent((c) => c + 1);
    } else {
      // Submit
      setPhase('analyzing');
      try {
        const res = await assessmentAPI.submit({
          quiz_id: quiz.quiz_id,
          answers: newAnswers,
          time_taken_seconds: Math.round((Date.now() - startTime) / 1000),
        });
        setResults(res.data);
        await fetchProfile();
        setTimeout(() => setPhase('results'), 2500);
      } catch {
        toast.error('Failed to submit assessment.');
        setPhase('intro');
      }
    }
  };

  const currentQ = quiz?.questions?.[current];
  const progress = quiz ? ((current) / quiz.questions.length) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="page-content" style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--bdr, #E2E8F0)' }}>
          <div className="ai-badge" style={{ marginBottom: 12 }}>
            <Brain size={12} /> 100% Dynamic AI Assessment
          </div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--ink, #0B1220)' }}>Skill Assessment</h1>
          <p style={{ color: 'var(--muted, #56657F)', fontSize: '0.9rem', marginTop: 4 }}>
            {phase === 'intro' && 'Configure your assessment. AI synthesizes brand-new questions specifically for your role.'}
            {phase === 'active' && `Question ${current + 1} of ${quiz?.questions?.length} · ${quiz?.career_goal || ''}`}
            {phase === 'analyzing' && 'Analyzing your responses...'}
            {phase === 'results' && 'Your assessment results are ready'}
          </p>
        </div>

        <div style={{ padding: '8px 0' }}>
          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 12,
                      background: 'rgba(47,91,255,0.1)',
                      border: '1px solid rgba(47,91,255,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Brain size={26} color="#2F5BFF" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink, #0B1220)', marginBottom: 4 }}>
                        Dynamic Skill Assessment Setup
                      </h2>
                      <p style={{ color: 'var(--muted, #56657F)', fontSize: '0.85rem' }}>
                        Nothing is pre-decided. Questions are generated dynamically by AI based on your exact choices.
                      </p>
                    </div>
                  </div>

                  {/* Career Goal */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Target Career Goal / Role
                    </label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Full Stack Developer, DevOps Engineer, Data Scientist, iOS Developer..."
                      value={careerGoal}
                      onChange={(e) => setCareerGoal(e.target.value)}
                      style={{ fontSize: '0.95rem', marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {SUGGESTED_ROLES.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setCareerGoal(role)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '5px 12px',
                            borderRadius: 14,
                            background: careerGoal === role ? 'rgba(47,91,255,0.12)' : 'transparent',
                            border: `1px solid ${careerGoal === role ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                            color: careerGoal === role ? '#2F5BFF' : 'var(--muted, #56657F)',
                            cursor: 'pointer',
                            fontWeight: careerGoal === role ? 600 : 500,
                            transition: 'all 0.15s',
                          }}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skill Level & Question Count */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Target Difficulty Level
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[
                          { key: 'beginner', label: 'Beginner' },
                          { key: 'intermediate', label: 'Intermediate' },
                          { key: 'advanced', label: 'Advanced' },
                        ].map((lvl) => (
                          <button
                            key={lvl.key}
                            type="button"
                            onClick={() => setSkillLevel(lvl.key)}
                            style={{
                              flex: 1,
                              padding: '8px 6px',
                              borderRadius: 8,
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background: skillLevel === lvl.key ? 'rgba(47,91,255,0.12)' : 'transparent',
                              border: `1px solid ${skillLevel === lvl.key ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                              color: skillLevel === lvl.key ? '#2F5BFF' : 'var(--muted, #56657F)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {lvl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Number of Questions
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[
                          { count: 5, label: '5 (~10m)' },
                          { count: 10, label: '10 (~20m)' },
                          { count: 15, label: '15 (~30m)' },
                        ].map((item) => (
                          <button
                            key={item.count}
                            type="button"
                            onClick={() => setQuestionCount(item.count)}
                            style={{
                              flex: 1,
                              padding: '8px 6px',
                              borderRadius: 8,
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background: questionCount === item.count ? 'rgba(47,91,255,0.12)' : 'transparent',
                              border: `1px solid ${questionCount === item.count ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                              color: questionCount === item.count ? '#2F5BFF' : 'var(--muted, #56657F)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Focus Topics */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink, #0B1220)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Focus Topics / Skills (Optional)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted, #56657F)' }}>Comma-separated or leave blank for AI auto-selection</span>
                    </div>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. React, Node.js, SQL OR Docker, Kubernetes, CI/CD..."
                      value={customTopics}
                      onChange={(e) => setCustomTopics(e.target.value)}
                      style={{ fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Dynamic AI badge summary */}
                  <div style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    borderLeft: '4px solid #2F5BFF',
                    borderTop: '1px solid var(--bdr, #E2E8F0)',
                    borderRight: '1px solid var(--bdr, #E2E8F0)',
                    borderBottom: '1px solid var(--bdr, #E2E8F0)',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <Zap size={20} color="#2F5BFF" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.85rem', color: 'var(--ink, #0B1220)', lineHeight: 1.5 }}>
                      Generating <strong style={{ color: '#2F5BFF' }}>{questionCount} dynamic questions</strong> specifically for <strong style={{ color: 'var(--ink, #0B1220)' }}>{careerGoal.trim() || 'Software Engineer'}</strong> ({skillLevel} level).
                      {customTopics.trim() ? ` Focus areas: ${customTopics}.` : ' AI will evaluate all core domain requirements.'}
                    </div>
                  </div>

                  <button
                    className="btn btn-primary btn-lg"
                    onClick={startAssessment}
                    disabled={loading}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {loading ? (
                      <><div className="spinner" style={{ width: 18, height: 18 }} /> Generating Dynamic Questions with AI...</>
                    ) : (
                      <><Zap size={18} /> Launch Dynamic Assessment</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 'active' && currentQ && (
              <motion.div key={`q-${current}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                {/* Progress */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted, #56657F)', fontWeight: 600 }}>Question {current + 1} / {quiz.questions.length}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted, #56657F)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Topic badge */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20,
                    background: 'rgba(47,91,255,0.1)', border: '1px solid rgba(47,91,255,0.25)',
                    color: '#2F5BFF', fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    {currentQ.topic_tag} · {currentQ.difficulty}
                  </span>
                </div>

                {/* Question */}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', lineHeight: 1.5, marginBottom: 20 }}>
                  {currentQ.text}
                </h3>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {currentQ.options?.map((opt, i) => (
                    <button
                      key={i}
                      className={`quiz-option ${selected === opt ? 'selected' : ''}`}
                      onClick={() => handleSelect(opt)}
                      style={{ padding: '12px 14px', fontSize: '0.9rem' }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        background: selected === opt ? 'rgba(47,91,255,0.15)' : 'transparent',
                        border: `1px solid ${selected === opt ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 700, color: selected === opt ? '#2F5BFF' : 'var(--muted, #56657F)',
                      }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span style={{ color: 'var(--ink, #0B1220)', flex: 1, textAlign: 'left' }}>{opt}</span>
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={!selected}
                >
                  {current + 1 < quiz.questions.length ? 'Next Question' : 'Submit Assessment'}
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            )}

            {phase === 'analyzing' && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AnalyzingAnimation />
              </motion.div>
            )}

            {phase === 'results' && results && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <ResultsView results={results} onRetake={() => setPhase('intro')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
