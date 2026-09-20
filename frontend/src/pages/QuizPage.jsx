import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, CheckCircle, XCircle, RefreshCw, Zap, ArrowLeft, Sparkles, FileText, BookMarked } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { quizAPI } from '../services/api';
import toast from 'react-hot-toast';

const TOPICS = [
  'Python Fundamentals', 'NumPy & Pandas', 'Statistics & Probability',
  'Machine Learning Basics', 'Deep Learning', 'Computer Vision', 'NLP'
];

function QuizResults({ results, topic, onRetake, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Score */}
      <div style={{
        textAlign: 'center', padding: '24px 0',
        borderBottom: '1px solid var(--bdr, #E2E8F0)',
      }}>
        <div style={{
          fontSize: '4rem', fontWeight: 900,
          color: results.score >= 80 ? '#10B981' : results.score >= 60 ? '#F59E0B' : '#EF4444',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {Math.round(results.score)}%
        </div>
        <div style={{ color: 'var(--muted, #56657F)', fontSize: '0.95rem', marginTop: 4 }}>
          {results.correct}/{results.total} correct · {topic}
        </div>
      </div>

      {/* Feedback */}
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        borderLeft: '4px solid #2F5BFF',
        borderTop: '1px solid var(--bdr, #E2E8F0)',
        borderRight: '1px solid var(--bdr, #E2E8F0)',
        borderBottom: '1px solid var(--bdr, #E2E8F0)',
      }}>
        <div className="ai-badge" style={{ marginBottom: 8, fontSize: '0.65rem' }}>AI Feedback</div>
        <p style={{ fontSize: '0.875rem', color: 'var(--ink, #0B1220)', lineHeight: 1.65 }}>{results.feedback}</p>
      </div>

      {/* Weak/Strong topics */}
      {results.weak_topics?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted, #56657F)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Weak Areas (Review These)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {results.weak_topics.map((t) => (
              <span key={t} className="badge badge-danger">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed results */}
      <div style={{ padding: '8px 0', borderBottom: '1px solid var(--bdr, #E2E8F0)' }}>
        <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '1rem', marginBottom: 14 }}>Question Review</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.detailed_results?.map((r, i) => (
            <div key={i} style={{
              padding: '12px 0',
              borderBottom: '1px solid var(--bdr, #E2E8F0)',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {r.is_correct
                  ? <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <XCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />}
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink, #0B1220)', fontWeight: 600, marginBottom: 4 }}>{r.question}</div>
                  {!r.is_correct && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted, #56657F)' }}>
                      Your answer: <span style={{ color: '#EF4444', fontWeight: 600 }}>{r.user_answer || '(none)'}</span> ·
                      Correct: <span style={{ color: '#10B981', fontWeight: 600 }}>{r.correct_answer}</span>
                    </div>
                  )}
                  {r.explanation && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted, #56657F)', marginTop: 4, lineHeight: 1.5 }}>
                      💡 {r.explanation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-outline" onClick={onRetake} style={{ flex: 1 }}>
          <RefreshCw size={14} /> Retake
        </button>
        <button className="btn btn-primary" onClick={onNext} style={{ flex: 2 }}>
          <Zap size={14} />
          {results.unlock_next ? 'Unlock Next Topic' : 'Back to Learning Path'}
        </button>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { topic: topicParam } = useParams();
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(topicParam ? decodeURIComponent(topicParam) : '');
  const [activeView, setActiveView] = useState('quiz'); // 'quiz' or 'study'
  const [selectedDifficulty, setSelectedDifficulty] = useState('intermediate');
  const [phase, setPhase] = useState(topicParam ? 'loading' : 'select');
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (topicParam) generateQuiz(decodeURIComponent(topicParam));
  }, [topicParam]);

  useEffect(() => {
    if (phase !== 'active') return;
    const t = setInterval(() => setTimer((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const generateQuiz = async (topic = selectedTopic, diff = selectedDifficulty) => {
    if (!topic) { toast.error('Please select a topic'); return; }
    setPhase('loading');
    try {
      const res = await quizAPI.generate({ topic, difficulty: diff, count: 5 });
      setQuiz(res.data);
      setCurrent(0);
      setAnswers({});
      setSelected(null);
      setStartTime(Date.now());
      setTimer(0);
      setActiveView('quiz');
      setPhase('active');
    } catch {
      toast.error('Failed to generate quiz. Is the backend running?');
      setPhase('select');
    }
  };

  const handleNext = async () => {
    if (!selected) { toast.error('Please select an answer'); return; }
    const newAnswers = { ...answers, [String(current)]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 < quiz.questions.length) {
      setCurrent((c) => c + 1);
    } else {
      setPhase('submitting');
      try {
        const res = await quizAPI.submit({
          quiz_id: quiz.quiz_id,
          answers: newAnswers,
          time_taken_seconds: Math.round((Date.now() - startTime) / 1000),
        });
        setResults(res.data);
        setPhase('results');
      } catch {
        toast.error('Failed to submit quiz.');
        setPhase('select');
      }
    }
  };

  const currentQ = quiz?.questions?.[current];

  return (
    <DashboardLayout>
      <div className="page-content" style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--bdr, #E2E8F0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} />
            </button>
            <div className="ai-badge"><BookOpen size={12} /> AI Quiz</div>
          </div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--ink, #0B1220)' }}>
            {phase === 'select' ? 'Topic Quiz' : selectedTopic || 'Quiz'}
          </h1>
        </div>

        <div style={{ padding: '8px 0' }}>
          <AnimatePresence mode="wait">
            {/* Topic selection */}
            {phase === 'select' && (
              <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12, fontSize: '1rem' }}>Select Topic</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                  {TOPICS.map((t) => (
                    <button
                      key={t}
                      className="quiz-option"
                      style={selectedTopic === t ? { borderColor: '#2F5BFF', background: 'rgba(47,91,255,0.12)', color: '#2F5BFF', fontWeight: 600 } : { color: 'var(--ink, #0B1220)' }}
                      onClick={() => setSelectedTopic(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 10, fontSize: '1rem' }}>Difficulty</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  {['beginner', 'intermediate', 'advanced'].map((d) => (
                    <button
                      key={d}
                      className={`skill-chip ${selectedDifficulty === d ? 'selected' : ''}`}
                      onClick={() => setSelectedDifficulty(d)}
                      style={{ flex: 1, justifyContent: 'center', textTransform: 'capitalize' }}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => generateQuiz()}
                  disabled={!selectedTopic}
                >
                  <Zap size={16} /> Generate Quiz
                </button>
              </motion.div>
            )}

            {/* Loading */}
            {(phase === 'loading' || phase === 'submitting') && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
                <p style={{ color: 'var(--muted, #56657F)' }}>
                  {phase === 'loading' ? 'Generating comprehensive study material & aligned quiz with AI...' : 'Analyzing your answers...'}
                </p>
              </motion.div>
            )}

            {/* Active quiz and study material */}
            {phase === 'active' && (
              <div>
                {/* View toggle */}
                {quiz?.study_material && (
                  <div style={{
                    display: 'flex', gap: 8, marginBottom: 20,
                    padding: '6px', borderRadius: 10,
                    background: 'var(--paper-alt, #F1F5F9)',
                    border: '1px solid var(--bdr, #E2E8F0)'
                  }}>
                    <button
                      className={`btn ${activeView === 'quiz' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                      onClick={() => setActiveView('quiz')}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.82rem' }}
                    >
                      <Zap size={14} /> Diagnostic Quiz ({current + 1}/{quiz.questions.length})
                    </button>
                    <button
                      className={`btn ${activeView === 'study' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                      onClick={() => setActiveView('study')}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.82rem' }}
                    >
                      <BookOpen size={14} /> Aligned Study Material
                    </button>
                  </div>
                )}

                {/* Study Material View */}
                {activeView === 'study' && quiz?.study_material && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div style={{
                      padding: 14, borderRadius: 10,
                      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                      marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: '0.82rem', color: '#047857', fontWeight: 600
                    }}>
                      <Sparkles size={16} />
                      This study material was generated simultaneously with your quiz. Every question is derived from this content.
                    </div>

                    {quiz.study_material.topic_introduction && (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 6 }}>Overview</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--ink, #1E293B)', lineHeight: 1.65 }}>
                          {quiz.study_material.topic_introduction}
                        </p>
                      </div>
                    )}

                    {quiz.study_material.definitions?.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>Key Definitions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {quiz.study_material.definitions.map((d, i) => (
                            <div key={i} style={{ padding: 12, borderRadius: 8, background: 'rgba(18,32,58,0.03)', border: '1px solid var(--bdr, #E2E8F0)' }}>
                              <strong style={{ color: '#2557E0', fontSize: '0.88rem' }}>{d.term}: </strong>
                              <span style={{ fontSize: '0.85rem', color: 'var(--ink, #1E293B)' }}>{d.definition}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {quiz.study_material.working_principles?.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>Working Principles</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {quiz.study_material.working_principles.map((p, i) => (
                            <div key={i} style={{ padding: 12, borderRadius: 8, background: 'rgba(18,32,58,0.03)', border: '1px solid var(--bdr, #E2E8F0)' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink, #0B1220)', marginBottom: 4 }}>{p.principle}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted, #475569)', lineHeight: 1.5 }}>{p.mechanism}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {quiz.study_material.common_mistakes?.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>Common Mistakes to Avoid</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {quiz.study_material.common_mistakes.map((m, i) => (
                            <div key={i} style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#DC2626', marginBottom: 4 }}>⚠️ {m.mistake}</div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--ink, #1E293B)', marginBottom: 2 }}><strong>Why it happens:</strong> {m.why_it_happens}</div>
                              <div style={{ fontSize: '0.82rem', color: '#059669' }}><strong>Correction:</strong> {m.correction}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveView('quiz')}
                      style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                    >
                      Return to Diagnostic Quiz Question {current + 1} <ArrowRight size={15} />
                    </button>
                  </motion.div>
                )}

                {/* Quiz View */}
                {activeView === 'quiz' && currentQ && (
                  <motion.div key={`q-${current}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted, #56657F)', fontWeight: 600 }}>
                          Question {current + 1} / {quiz.questions.length}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted, #56657F)', fontFamily: 'JetBrains Mono, monospace' }}>
                          ⏱ {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${(current / quiz.questions.length) * 100}%` }} />
                      </div>
                    </div>

                    {currentQ.concept_tag && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.22)',
                        color: '#059669', fontSize: '0.74rem', fontWeight: 600,
                        marginBottom: 12
                      }}>
                        <Sparkles size={12} /> Aligned with Study Material · {currentQ.concept_tag}
                      </div>
                    )}

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', lineHeight: 1.55, marginBottom: 20 }}>
                      {currentQ.text}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                      {currentQ.options?.map((opt, i) => (
                        <button
                          key={i}
                          className={`quiz-option ${selected === opt ? 'selected' : ''}`}
                          onClick={() => setSelected(opt)}
                          style={{ padding: '12px 14px', fontSize: '0.9rem' }}
                        >
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                            background: selected === opt ? 'rgba(47,91,255,0.15)' : 'transparent',
                            border: `1px solid ${selected === opt ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 700,
                            color: selected === opt ? '#2F5BFF' : 'var(--muted, #56657F)',
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
                      {current + 1 < quiz.questions.length ? 'Next Question' : 'Submit Quiz'}
                      <ChevronRight size={16} />
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Results */}
            {phase === 'results' && results && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <QuizResults
                  results={results}
                  topic={quiz?.topic || selectedTopic}
                  onRetake={() => generateQuiz()}
                  onNext={() => navigate('/learning-path')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
