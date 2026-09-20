import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map, CheckCircle, Lock, Play, ChevronRight, ChevronLeft, Zap, Brain,
  BookOpen, FileText, Code, Layers, ExternalLink, X, AlertCircle, RefreshCw,
  HelpCircle, Award, Target, Clock, ArrowRight, ShieldAlert, Sparkles,
  BarChart3, Check, Eye, EyeOff
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { learningPathAPI, quizAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { LearningPath3DSpire } from '../components/3d/Section3DScenes';

const RESOURCE_ICONS = {
  video: { icon: '🎥', color: '#ff4d6d', label: 'Video' },
  article: { icon: '📖', color: '#00d4ff', label: 'Article' },
  docs: { icon: '📄', color: '#ffb800', label: 'Docs' },
  book: { icon: '📚', color: '#00e5a0', label: 'Book' },
  practice: { icon: '💻', color: '#6c63ff', label: 'Practice' },
  project: { icon: '🛠️', color: '#ff8c42', label: 'Project' },
};

/* ─── TAB 1: DETAILED LEARNING CONTENT ───────────────────────────── */
function TopicStudyView({ item, contentData, loadingContent, onMarkStudied, onGoToQuiz }) {
  if (loadingContent) {
    return (
      <div style={{ textAlign: 'center', padding: '70px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 20px', width: 36, height: 36 }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>
          Generating Comprehensive Study Material & Diagnostic Quiz...
        </h3>
        <p style={{ color: 'var(--muted, #475569)', fontSize: '0.9rem', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
          AI is assembling exhaustive university-grade study material and 30 aligned diagnostic quiz questions directly based on this material for <strong>{item.topic_name}</strong>.
        </p>
      </div>
    );
  }

  const content = contentData?.content || {};
  const sources = contentData?.sources || content?.sources_and_references || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Synchronization Notice Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px', borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 100%)',
        border: '1px solid rgba(16,185,129,0.22)',
        flexWrap: 'wrap', gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Sparkles size={16} color="#059669" />
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#047857' }}>
            Diagnostic Quiz Synchronized:
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted, #475569)' }}>
            All 30 diagnostic questions were generated at the same time and derived directly from these definitions, principles, and code examples.
          </span>
        </div>
        <button
          className="btn btn-outline"
          onClick={onGoToQuiz}
          style={{ fontSize: '0.78rem', padding: '5px 12px', height: 'auto', color: '#047857', borderColor: 'rgba(16,185,129,0.3)' }}
        >
          View Aligned Quiz →
        </button>
      </div>
      {/* Overview Hero */}
      <div style={{
        padding: '24px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(37,87,224,0.06) 0%, rgba(67,56,202,0.03) 100%)',
        border: '1px solid rgba(37,87,224,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
            {item.difficulty} Level
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted, #475569)' }}>
            Estimated study time: {item.estimated_hours} hours
          </span>
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ink, #0B1220)', margin: '0 0 10px' }}>
          {item.topic_name}
        </h2>
        <p style={{ fontSize: '0.98rem', color: 'var(--ink, #1E293B)', lineHeight: 1.7, margin: 0 }}>
          {content.topic_introduction || item.topic_description}
        </p>
      </div>

      {/* Detailed Technical Explanation */}
      {content.detailed_explanation && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="#2557E0" /> In-Depth Explanation
          </h3>
          <div style={{
            fontSize: '0.95rem',
            lineHeight: 1.8,
            color: 'var(--ink, #1E293B)',
            background: 'var(--clr-surface-200, #F1F5F9)',
            padding: '20px 24px',
            borderRadius: 12,
            border: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
            whiteSpace: 'pre-line',
          }}>
            {content.detailed_explanation}
          </div>
        </section>
      )}

      {/* Important Concepts & Sub-Concepts */}
      {content.important_concepts?.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="#2557E0" /> Core Concepts & Architecture
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {content.important_concepts.map((concept, idx) => (
              <div key={idx} style={{
                padding: '16px 18px',
                borderRadius: 10,
                background: 'var(--paper, #ffffff)',
                border: '1px solid var(--line, rgba(18, 32, 58, 0.12))',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#2557E0', marginBottom: 6 }}>
                  {concept.title}
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--muted, #334155)', lineHeight: 1.6 }}>
                  {concept.explanation}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Definitions / Glossary */}
      {content.definitions?.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#2557E0" /> Terminology & Definitions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {content.definitions.map((def, idx) => (
              <div key={idx} style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: 'var(--paper, #ffffff)',
                borderLeft: '3px solid #2557E0',
                borderTop: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
                borderRight: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
                borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
              }}>
                <span style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '0.9rem' }}>
                  {def.term}:{' '}
                </span>
                <span style={{ color: 'var(--muted, #334155)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  {def.definition}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Working Principles & Mechanics */}
      {content.working_principles?.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#D97706" /> Working Principles & Internal Mechanics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {content.working_principles.map((wp, idx) => (
              <div key={idx} style={{
                padding: '14px 18px',
                borderRadius: 10,
                background: 'rgba(217, 119, 6, 0.04)',
                border: '1px solid rgba(217, 119, 6, 0.18)',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#B45309', marginBottom: 4 }}>
                  {wp.principle}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--ink, #1E293B)', lineHeight: 1.6 }}>
                  {wp.mechanism}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Concrete Worked Examples / Code Snippets */}
      {content.examples?.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Code size={18} color="#059669" /> Concrete Worked Examples
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {content.examples.map((ex, idx) => (
              <div key={idx} style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--line, rgba(18, 32, 58, 0.12))',
                background: 'var(--paper, #ffffff)',
              }}>
                <div style={{
                  padding: '10px 16px',
                  background: 'var(--clr-surface-200, #F1F5F9)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: 'var(--ink, #0B1220)',
                  borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
                }}>
                  {ex.title}
                </div>
                {ex.code_or_snippet && (
                  <pre style={{
                    margin: 0,
                    padding: '14px 18px',
                    background: '#0B1220',
                    color: '#F8FAFC',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.84rem',
                    overflowX: 'auto',
                    lineHeight: 1.6,
                  }}>
                    <code>{ex.code_or_snippet}</code>
                  </pre>
                )}
                <div style={{ padding: '12px 16px', fontSize: '0.86rem', color: 'var(--muted, #334155)', lineHeight: 1.6 }}>
                  {ex.explanation}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Step-by-Step Guide */}
      {content.step_by_step_guide?.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12 }}>
            Step-by-Step Implementation Guide
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {content.step_by_step_guide.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#2557E0', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                }}>
                  {step.step_number || idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink, #0B1220)', marginBottom: 2 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--muted, #334155)', lineHeight: 1.5 }}>
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Common Mistakes & Anti-Patterns */}
      {content.common_mistakes?.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#DC2626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color="#DC2626" /> Common Mistakes & Anti-Patterns
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {content.common_mistakes.map((mistake, idx) => (
              <div key={idx} style={{
                padding: '14px 18px',
                borderRadius: 10,
                background: 'rgba(220, 38, 38, 0.04)',
                border: '1px solid rgba(220, 38, 38, 0.16)',
              }}>
                <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.9rem', marginBottom: 4 }}>
                  ⚠️ {mistake.mistake}
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--muted, #475569)', marginBottom: 6 }}>
                  <strong>Why it happens:</strong> {mistake.why_it_happens}
                </div>
                <div style={{ fontSize: '0.86rem', color: '#059669', fontWeight: 600 }}>
                  ✓ <strong>Correction:</strong> {mistake.correction}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Exam / Interview High-Yield Points */}
      {content.exam_oriented_points?.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} color="#2557E0" /> Exam & Interview Focus Points
          </h3>
          <div style={{
            padding: '16px 20px',
            borderRadius: 10,
            background: 'var(--clr-surface-200, #F1F5F9)',
            border: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
          }}>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {content.exam_oriented_points.map((pt, idx) => (
                <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--ink, #1E293B)', lineHeight: 1.6 }}>
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Crucial Points to Remember */}
      {content.important_points_to_remember?.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#4338CA" /> Important Points to Remember
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 10,
          }}>
            {content.important_points_to_remember.map((pt, idx) => (
              <div key={idx} style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'var(--paper, #ffffff)',
                border: '1px solid var(--line, rgba(18, 32, 58, 0.1))',
                fontSize: '0.86rem',
                color: 'var(--ink, #1E293B)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}>
                <Check size={16} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── CLEARLY SEPARATED SOURCES & REFERENCES ───────────────── */}
      <section style={{
        marginTop: 12,
        padding: '24px',
        borderRadius: 14,
        background: '#0B1220',
        color: '#F8FAFC',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <BookOpen size={20} color="#38BDF8" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
            Official Sources & Academic References
          </h3>
        </div>
        <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginBottom: 18 }}>
          Standard textbooks, official documentation, university curricula, and research literature.
        </p>

        {sources.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sources.map((src, idx) => (
              <div key={idx} style={{
                padding: '14px 18px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8',
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                    }}>
                      {src.type || 'Official Documentation'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                      {src.author_or_organization || src.author}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#F8FAFC' }}>
                    {src.title}
                  </div>
                  {(src.citation_note || src.description) && (
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: 2 }}>
                      {src.citation_note || src.description}
                    </div>
                  )}
                </div>
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      color: '#38BDF8', fontSize: '0.82rem', textDecoration: 'none',
                      padding: '6px 12px', borderRadius: 6,
                      background: 'rgba(56, 189, 248, 0.1)',
                      flexShrink: 0,
                    }}
                  >
                    View Source <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
            Curated from standard computer science curricula and official language / framework standards.
          </div>
        )}
      </section>

      {/* Completion Action Bar */}
      <div style={{
        marginTop: 10,
        padding: '18px 24px',
        borderRadius: 12,
        background: 'var(--paper, #ffffff)',
        border: '1px solid var(--line, rgba(18, 32, 58, 0.12))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 14,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink, #0B1220)' }}>
            {contentData?.content_studied ? '✓ Reading Material Studied' : 'Ready for the Evaluation?'}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted, #475569)' }}>
            {contentData?.content_studied
              ? 'You have completed studying this topic. Take the 30-question diagnostic quiz to unlock the next module.'
              : 'Complete studying all sections thoroughly before attempting the 30-question topic quiz.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {!contentData?.content_studied ? (
            <button
              className="btn btn-primary"
              onClick={onMarkStudied}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <CheckCircle size={16} /> Mark as Studied & Unlock Quiz
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onGoToQuiz}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Zap size={16} /> Take 30-Question Quiz <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── TAB 2: 30-QUESTION DIAGNOSTIC QUIZ ──────────────────────────── */
function TopicQuizView({
  item, quiz, loadingQuiz, currentQ, setCurrentQ,
  answers, setAnswers, selectedOpt, setSelectedOpt,
  quizTimer, submittingQuiz, onSubmitQuiz, onLoadQuiz
}) {
  const [showHint, setShowHint] = useState(false);

  if (loadingQuiz) {
    return (
      <div style={{ textAlign: 'center', padding: '70px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 20px', width: 36, height: 36 }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>
          Generating 30 Diagnostic Questions for {item.topic_name}...
        </h3>
        <p style={{ color: 'var(--muted, #475569)', fontSize: '0.9rem', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
          AI is assembling 30 questions covering definitions, internal mechanics, common misconceptions, application scenarios, and exam edge cases with detailed explanations.
        </p>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <HelpCircle size={48} color="#2557E0" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>
          Quiz Not Loaded
        </h3>
        <p style={{ color: 'var(--muted, #475569)', fontSize: '0.9rem', marginBottom: 20 }}>
          Click below to load the 30-question diagnostic quiz for {item.topic_name}.
        </p>
        <button className="btn btn-primary" onClick={onLoadQuiz}>
          <Zap size={16} /> Load 30-Question Quiz
        </button>
      </div>
    );
  }

  const questions = quiz.questions;
  const current = questions[currentQ] || questions[0];
  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = (opt) => {
    setSelectedOpt(opt);
    setAnswers((prev) => ({ ...prev, [String(currentQ)]: opt }));
  };

  const handleNext = () => {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
      setSelectedOpt(answers[String(currentQ + 1)] || null);
      setShowHint(false);
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setSelectedOpt(answers[String(currentQ - 1)] || null);
      setShowHint(false);
    }
  };

  const handleJump = (idx) => {
    setCurrentQ(idx);
    setSelectedOpt(answers[String(idx)] || null);
    setShowHint(false);
  };

  const handleFinalSubmit = () => {
    if (answeredCount < questions.length) {
      const confirmSubmit = window.confirm(
        `You have answered ${answeredCount} of ${questions.length} questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }
    onSubmitQuiz();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Quiz Top Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderRadius: 12,
        background: 'var(--paper, #ffffff)',
        border: '1px solid var(--line, rgba(18, 32, 58, 0.1))',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--ink, #0B1220)' }}>
            Question {currentQ + 1} of {questions.length}
          </span>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
            {current.concept_tag || 'Concept Test'}
          </span>
          <span className="badge" style={{ fontSize: '0.72rem', textTransform: 'capitalize', background: 'rgba(18,32,58,0.06)' }}>
            {current.difficulty || 'Intermediate'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink, #0B1220)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.92rem' }}>
            <Clock size={16} color="#2557E0" />
            <span>{Math.floor(quizTimer / 60)}:{String(quizTimer % 60).padStart(2, '0')}</span>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted, #475569)' }}>
            <strong>{answeredCount}</strong> / {questions.length} Answered
          </span>
        </div>
      </div>

      {/* 30-Question Palette Drawer */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 10,
        background: 'var(--clr-surface-200, #F1F5F9)',
        border: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted, #475569)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
          Question Navigator (30 Questions)
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))',
          gap: 6,
        }}>
          {questions.map((_, idx) => {
            const isAnswered = answers[String(idx)] !== undefined;
            const isCurrent = idx === currentQ;
            return (
              <button
                key={idx}
                onClick={() => handleJump(idx)}
                style={{
                  height: 32,
                  borderRadius: 6,
                  border: isCurrent ? '2px solid #2557E0' : isAnswered ? '1px solid #059669' : '1px solid var(--line, rgba(18, 32, 58, 0.15))',
                  background: isCurrent ? '#2557E0' : isAnswered ? 'rgba(5, 150, 105, 0.15)' : 'var(--paper, #ffffff)',
                  color: isCurrent ? '#ffffff' : isAnswered ? '#059669' : 'var(--ink, #0B1220)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Question Body */}
      <div style={{
        padding: '24px',
        borderRadius: 14,
        background: 'var(--paper, #ffffff)',
        border: '1px solid var(--line, rgba(18, 32, 58, 0.12))',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '0.75rem', color: '#4338CA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Question {currentQ + 1} · {current.type || 'Single-choice MCQ'}
          </span>
          {current.hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              style={{
                background: 'none', border: 'none', color: '#D97706',
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <HelpCircle size={15} /> {showHint ? 'Hide Hint' : 'Need a Hint?'}
            </button>
          )}
        </div>

        {/* Collapsible Hint */}
        {showHint && current.hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(217, 119, 6, 0.08)',
              border: '1px solid rgba(217, 119, 6, 0.2)',
              fontSize: '0.84rem', color: '#B45309', marginBottom: 16, lineHeight: 1.5,
            }}
          >
            💡 <strong>Hint:</strong> {current.hint}
          </motion.div>
        )}

        <h3 style={{
          fontSize: '1.08rem', fontWeight: 700, color: 'var(--ink, #0B1220)',
          lineHeight: 1.6, marginBottom: 20,
        }}>
          {current.text}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {current.options?.map((opt, i) => {
            const isSelected = selectedOpt === opt || answers[String(currentQ)] === opt;
            return (
              <button
                key={i}
                onClick={() => handleSelectOption(opt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 10,
                  border: isSelected ? '2px solid #2557E0' : '1px solid var(--line, rgba(18, 32, 58, 0.12))',
                  background: isSelected ? 'rgba(37, 87, 224, 0.06)' : 'var(--paper, #ffffff)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  border: isSelected ? '2px solid #2557E0' : '1px solid var(--line, rgba(18, 32, 58, 0.25))',
                  background: isSelected ? '#2557E0' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--muted, #475569)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.78rem',
                }}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span style={{ fontSize: '0.92rem', color: isSelected ? '#2557E0' : 'var(--ink, #0B1220)', fontWeight: isSelected ? 600 : 400 }}>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigation Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={handlePrev}
            disabled={currentQ === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            {currentQ + 1 < questions.length ? (
              <button
                className="btn btn-primary"
                onClick={handleNext}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                Next Question <ChevronRight size={16} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleFinalSubmit}
                disabled={submittingQuiz}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#059669', borderColor: '#059669' }}
              >
                {submittingQuiz ? (
                  <><div className="spinner" style={{ width: 16, height: 16 }} /> Scoring 30 Questions...</>
                ) : (
                  <><CheckCircle size={16} /> Submit & Analyze Diagnostic Quiz</>
                )}
              </button>
            )}

            {currentQ + 1 < questions.length && (
              <button
                className="btn btn-outline"
                onClick={handleFinalSubmit}
                disabled={submittingQuiz}
                style={{ fontSize: '0.84rem' }}
              >
                Submit Quiz ({answeredCount}/{questions.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── TAB 3: LEARNING ANALYSIS REPORT ────────────────────────────── */
function TopicAnalysisView({ result, onRetake, onNextTopic, onGoToRemedial }) {
  const [expandedQ, setExpandedQ] = useState(null);

  if (!result) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <BarChart3 size={48} color="#2557E0" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>
          No Quiz Attempt Analyzed Yet
        </h3>
        <p style={{ color: 'var(--muted, #475569)', fontSize: '0.9rem' }}>
          Take the 30-question diagnostic quiz to generate granular concept mastery analytics and unlock the next topic.
        </p>
      </div>
    );
  }

  const passed = result.passed ?? (result.score >= 70);
  const conceptPerf = result.concept_performance || {};
  const diffPerf = result.difficulty_performance || {};
  const weakConcepts = result.weak_concepts || [];
  const strongConcepts = result.strong_concepts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Score Banner */}
      <div style={{
        textAlign: 'center',
        padding: '30px 24px',
        borderRadius: 16,
        background: passed
          ? 'linear-gradient(135deg, rgba(5,150,105,0.08) 0%, rgba(37,87,224,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(217,119,6,0.06) 100%)',
        border: passed ? '1px solid rgba(5,150,105,0.25)' : '1px solid rgba(220,38,38,0.25)',
      }}>
        <div style={{
          fontSize: '3.8rem', fontWeight: 900,
          fontFamily: 'JetBrains Mono, monospace',
          color: passed ? '#059669' : '#DC2626',
          lineHeight: 1,
        }}>
          {Math.round(result.score)}%
        </div>
        <div style={{
          fontSize: '1.15rem', fontWeight: 800, marginTop: 10,
          color: passed ? '#059669' : '#DC2626',
        }}>
          {passed ? '🎉 Topic Mastered (Passed)' : '⚠️ Mastery Threshold Not Met (< 70%)'}
        </div>
        <p style={{ fontSize: '0.92rem', color: 'var(--ink, #1E293B)', maxWidth: 580, margin: '10px auto 0', lineHeight: 1.6 }}>
          {result.feedback}
        </p>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 12,
      }}>
        {[
          { label: 'Questions Evaluated', val: result.total || 30 },
          { label: 'Correct Answers', val: result.correct || 0, color: '#059669' },
          { label: 'Incorrect Answers', val: (result.total || 30) - (result.correct || 0), color: '#DC2626' },
          { label: 'Accuracy', val: `${Math.round(result.score)}%` },
          { label: 'Time Spent', val: `${Math.round((result.time_taken_seconds || 0) / 60)} mins` },
        ].map((m, i) => (
          <div key={i} style={{
            padding: '14px', borderRadius: 10,
            background: 'var(--paper, #ffffff)',
            border: '1px solid var(--line, rgba(18, 32, 58, 0.1))',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted, #475569)', textTransform: 'uppercase', marginBottom: 4 }}>
              {m.label}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.color || 'var(--ink, #0B1220)' }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      {/* Difficulty Breakdown */}
      {Object.keys(diffPerf).length > 0 && (
        <div style={{
          padding: '20px', borderRadius: 12,
          background: 'var(--paper, #ffffff)',
          border: '1px solid var(--line, rgba(18, 32, 58, 0.1))',
        }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink, #0B1220)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: '0.05em' }}>
            Cognitive Difficulty Breakdown
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {Object.entries(diffPerf).map(([level, data]) => (
              <div key={level} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--clr-surface-200, #F1F5F9)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--ink, #0B1220)' }}>
                    {level}
                  </span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: data.pct >= 70 ? '#059669' : '#DC2626' }}>
                    {data.pct}% ({data.correct}/{data.total})
                  </span>
                </div>
                <div className="progress-bar-track" style={{ height: 6 }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${data.pct}%`,
                      background: data.pct >= 70 ? '#059669' : '#DC2626',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concept Mastery Matrix */}
      {Object.keys(conceptPerf).length > 0 && (
        <div style={{
          padding: '20px', borderRadius: 12,
          background: 'var(--paper, #ffffff)',
          border: '1px solid var(--line, rgba(18, 32, 58, 0.1))',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink, #0B1220)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Individual Concept-by-Concept Mastery Analysis
            </h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted, #475569)' }}>
              Passing criteria: Strong (≥80%) / Medium (60-79%) / Weak (&lt;60%)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(conceptPerf).map(([concept, data]) => {
              const statusColor = data.status === 'Strong' ? '#059669' : data.status === 'Medium' ? '#D97706' : '#DC2626';
              const statusBg = data.status === 'Strong' ? 'rgba(5, 150, 105, 0.1)' : data.status === 'Medium' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(220, 38, 38, 0.1)';

              return (
                <div key={concept} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
                  background: 'var(--paper, #ffffff)',
                  gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink, #0B1220)' }}>
                      {concept}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--muted, #475569)' }}>
                      {data.correct} of {data.total} correct
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.9rem', color: statusColor }}>
                      {data.score}%
                    </span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6,
                      background: statusBg, color: statusColor,
                      fontWeight: 700, fontSize: '0.76rem',
                    }}>
                      {data.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Question Review Accordion */}
      {result.detailed_results?.length > 0 && (
        <div style={{
          padding: '20px', borderRadius: 12,
          background: 'var(--paper, #ffffff)',
          border: '1px solid var(--line, rgba(18, 32, 58, 0.1))',
        }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink, #0B1220)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: '0.05em' }}>
            Comprehensive 30-Question Breakdown & Explanations
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.detailed_results.map((r, i) => {
              const isExpanded = expandedQ === i;
              return (
                <div key={i} style={{
                  padding: '12px 16px', borderRadius: 8,
                  border: `1px solid ${r.is_correct ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
                  background: r.is_correct ? 'rgba(5,150,105,0.02)' : 'rgba(220,38,38,0.02)',
                }}>
                  <div
                    onClick={() => setExpandedQ(isExpanded ? null : i)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', gap: 10 }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4,
                        background: r.is_correct ? '#059669' : '#DC2626', color: '#fff',
                        fontWeight: 700, fontSize: '0.72rem', flexShrink: 0,
                      }}>
                        Q{i + 1}
                      </span>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink, #0B1220)', lineHeight: 1.5 }}>
                        {r.question}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: r.is_correct ? '#059669' : '#DC2626', fontWeight: 700, flexShrink: 0 }}>
                      {r.is_correct ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--muted, #475569)', paddingLeft: 34 }}>
                    {!r.is_correct && (
                      <div style={{ marginBottom: 4 }}>
                        Your answer: <span style={{ color: '#DC2626', fontWeight: 600 }}>{r.user_answer || '(None)'}</span> ·
                        Correct answer: <span style={{ color: '#059669', fontWeight: 600 }}>{r.correct_answer}</span>
                      </div>
                    )}
                    {r.explanation && (
                      <div style={{
                        marginTop: 6,
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: 'var(--clr-surface-200, #F1F5F9)',
                        color: 'var(--ink, #1E293B)',
                        lineHeight: 1.5,
                      }}>
                        💡 <strong>Explanation:</strong> {r.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-outline" onClick={onRetake} style={{ flex: 1, justifyContent: 'center' }}>
          <RefreshCw size={15} /> Retake Diagnostic Quiz
        </button>

        {!passed && (
          <button
            className="btn btn-primary"
            onClick={onGoToRemedial}
            style={{ flex: 2, justifyContent: 'center', background: '#D97706', borderColor: '#D97706' }}
          >
            <Sparkles size={15} /> Open Remedial Revision (Weak Concepts)
          </button>
        )}

        {passed && (
          <button
            className="btn btn-primary"
            onClick={onNextTopic}
            style={{ flex: 2, justifyContent: 'center', background: '#059669', borderColor: '#059669' }}
          >
            Unlock Next Topic <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── TAB 4: REMEDIAL REVISION VIEW ───────────────────────────────── */
function TopicRemedialView({ remedialContent, onRetakeQuiz }) {
  const [showAnswers, setShowAnswers] = useState({});

  if (!remedialContent) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <CheckCircle size={48} color="#059669" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>
          No Remedial Revision Needed!
        </h3>
        <p style={{ color: 'var(--muted, #475569)', fontSize: '0.9rem' }}>
          You have mastered this topic with high competence.
        </p>
      </div>
    );
  }

  const toggleShow = (idx) => {
    setShowAnswers((p) => ({ ...p, [idx]: !p[idx] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Diagnostic Hero */}
      <div style={{
        padding: '20px 24px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(220, 38, 38, 0.04) 100%)',
        border: '1px solid rgba(217, 119, 6, 0.2)',
      }}>
        <div className="badge" style={{ background: '#D97706', color: '#fff', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: 8 }}>
          Targeted Remedial Package
        </div>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink, #0B1220)', margin: '0 0 8px' }}>
          Reinforce Weak Areas & Clear Misconceptions
        </h3>
        <p style={{ fontSize: '0.92rem', color: 'var(--ink, #1E293B)', lineHeight: 1.6, margin: 0 }}>
          {remedialContent.remedial_summary}
        </p>
      </div>

      {/* Concept Breakdowns */}
      {remedialContent.concept_breakdowns?.length > 0 && (
        <section>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12 }}>
            Conceptual Deep Dives
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {remedialContent.concept_breakdowns.map((cb, idx) => (
              <div key={idx} style={{
                padding: '18px 20px',
                borderRadius: 12,
                background: 'var(--paper, #ffffff)',
                border: '1px solid var(--line, rgba(18, 32, 58, 0.12))',
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#D97706', marginBottom: 6 }}>
                  {cb.concept}
                </div>
                {cb.why_difficult && (
                  <div style={{ fontSize: '0.84rem', color: 'var(--muted, #475569)', marginBottom: 8 }}>
                    <strong>Common hurdle:</strong> {cb.why_difficult}
                  </div>
                )}
                <div style={{ fontSize: '0.9rem', color: 'var(--ink, #1E293B)', lineHeight: 1.7, marginBottom: 8 }}>
                  {cb.core_explanation}
                </div>
                {cb.rule_of_thumb && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 6,
                    background: 'rgba(5, 150, 105, 0.08)',
                    color: '#059669', fontSize: '0.84rem', fontWeight: 600,
                  }}>
                    💡 <strong>Rule of Thumb:</strong> {cb.rule_of_thumb}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Remedial Practice Questions */}
      {remedialContent.practice_questions?.length > 0 && (
        <section>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 12 }}>
            Remedial Practice Questions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {remedialContent.practice_questions.map((pq, idx) => (
              <div key={idx} style={{
                padding: '18px 20px',
                borderRadius: 12,
                background: 'var(--paper, #ffffff)',
                border: '1px solid var(--line, rgba(18, 32, 58, 0.12))',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink, #0B1220)', marginBottom: 12, lineHeight: 1.5 }}>
                  Practice {idx + 1}: {pq.question}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {pq.options?.map((opt, i) => (
                    <div key={i} style={{
                      padding: '8px 12px', borderRadius: 6,
                      background: 'var(--clr-surface-200, #F1F5F9)',
                      fontSize: '0.86rem', color: 'var(--ink, #0B1220)',
                    }}>
                      <strong>{String.fromCharCode(65 + i)}.</strong> {opt}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => toggleShow(idx)}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    {showAnswers[idx] ? <><EyeOff size={14} /> Hide Explanation</> : <><Eye size={14} /> Show Correct Answer & Explanation</>}
                  </button>
                </div>

                {showAnswers[idx] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      marginTop: 12,
                      padding: '10px 14px', borderRadius: 8,
                      background: 'rgba(5, 150, 105, 0.08)',
                      border: '1px solid rgba(5, 150, 105, 0.2)',
                      fontSize: '0.85rem', color: '#059669', lineHeight: 1.5,
                    }}
                  >
                    <div><strong>Correct Answer:</strong> {pq.correct_answer}</div>
                    <div style={{ marginTop: 4 }}>{pq.explanation}</div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Retake Callout */}
      <div style={{
        padding: '18px 24px', borderRadius: 12,
        background: 'var(--clr-surface-200, #F1F5F9)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink, #0B1220)' }}>
            Ready to retake the diagnostic quiz?
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted, #475569)' }}>
            Once you score ≥ 70%, the next topic in your learning path will be immediately unlocked.
          </div>
        </div>
        <button className="btn btn-primary" onClick={onRetakeQuiz}>
          <RefreshCw size={15} /> Retake 30-Question Quiz Now
        </button>
      </div>
    </div>
  );
}

/* ─── MODAL CONTAINER FOR CURRENT TOPIC ───────────────────────────── */
function TopicModal({ item, onClose, onPathUpdate }) {
  const [tab, setTab] = useState('study'); // 'study' | 'quiz' | 'analysis' | 'remedial'
  const [contentData, setContentData] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Quiz states
  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizTimer, setQuizTimer] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // Load content on mount
  useEffect(() => {
    loadTopicContent();
  }, [item.id]);

  // Quiz timer
  useEffect(() => {
    if (tab !== 'quiz' || quizResult || !quiz) return;
    const t = setInterval(() => setQuizTimer((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, [tab, quizResult, quiz]);

  const loadTopicContent = async () => {
    setLoadingContent(true);
    try {
      const res = await learningPathAPI.getTopicContent(item.id);
      setContentData(res.data);
      if (res.data.quiz) {
        setQuiz(res.data.quiz);
        setCurrentQ(0);
        setAnswers({});
        setSelectedOpt(null);
        setQuizTimer(0);
        setStartTime(Date.now());
      }
      if (res.data.analysis) {
        setQuizResult(res.data.analysis);
      }
    } catch (err) {
      toast.error('Failed to load topic content.');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleMarkStudied = async () => {
    try {
      const res = await learningPathAPI.markStudyComplete(item.id);
      toast.success('🎉 Topic marked as studied! Diagnostic quiz unlocked.');
      setContentData((prev) => ({ ...prev, content_studied: true }));
      setTab('quiz');
      if (!quiz) {
        loadQuiz();
      }
      if (onPathUpdate) onPathUpdate();
    } catch {
      toast.error('Failed to mark topic as studied.');
    }
  };

  const loadQuiz = async () => {
    setLoadingQuiz(true);
    try {
      const res = await learningPathAPI.getItemQuiz(item.id);
      setQuiz(res.data);
      setCurrentQ(0);
      setAnswers({});
      setSelectedOpt(null);
      setQuizTimer(0);
      setStartTime(Date.now());
    } catch {
      toast.error('Failed to load quiz for this module.');
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    setSubmittingQuiz(true);
    try {
      const timeTaken = Math.round((Date.now() - (startTime || Date.now())) / 1000);
      const res = await quizAPI.submit({
        quiz_id: quiz.quiz_id,
        answers: answers,
        time_taken_seconds: timeTaken,
      });

      setQuizResult(res.data);
      setTab('analysis');

      if (res.data.passed) {
        toast.success('🎉 Outstanding! Topic mastered and next module unlocked!');
      } else {
        toast('Mastery threshold not met (< 70%). Check your remedial revision package.', { icon: '💡' });
      }

      if (onPathUpdate) onPathUpdate();
    } catch {
      toast.error('Failed to submit quiz.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleSwitchTab = (newTab) => {
    setTab(newTab);
    if (newTab === 'quiz' && !quiz) {
      loadQuiz();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 300,
      background: 'rgba(11, 18, 32, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        style={{
          width: 'min(1100px, 96vw)',
          height: '92vh',
          background: 'var(--paper, #ffffff)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          border: '1px solid var(--line, rgba(18, 32, 58, 0.15))',
        }}
      >
        {/* Modal Top Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.1))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: 'var(--paper, #ffffff)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: '#2557E0', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.88rem',
            }}>
              {item.order_index + 1}
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--ink, #0B1220)' }}>
                {item.topic_name}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge" style={{ textTransform: 'capitalize', fontSize: '0.72rem', background: 'rgba(18,32,58,0.06)' }}>
                  {item.difficulty}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted, #475569)' }}>
                  {item.estimated_hours}h estimated
                </span>
                <span className="badge badge-success" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <button
            className="btn-icon"
            onClick={onClose}
            style={{ color: 'var(--muted, #475569)', width: 34, height: 34 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          padding: '0 24px',
          borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.1))',
          background: 'var(--clr-surface-200, #F1F5F9)',
          flexShrink: 0,
          gap: 6,
        }}>
          {[
            { id: 'study', label: '1. Deep Study Material', icon: BookOpen },
            { id: 'quiz', label: '2. Diagnostic Quiz (30 Qs)', icon: Brain },
            { id: 'analysis', label: '3. Learning Analysis', icon: BarChart3 },
            ...(quizResult && !quizResult.passed ? [{ id: 'remedial', label: '4. Remedial Revision', icon: Sparkles }] : []),
          ].map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleSwitchTab(t.id)}
                style={{
                  padding: '12px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: isActive ? '#2557E0' : 'var(--muted, #475569)',
                  borderBottom: `3px solid ${isActive ? '#2557E0' : 'transparent'}`,
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: 3,
                  borderBottomStyle: 'solid',
                  borderBottomColor: isActive ? '#2557E0' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px' }}>
          {tab === 'study' && (
            <TopicStudyView
              item={item}
              contentData={contentData}
              loadingContent={loadingContent}
              onMarkStudied={handleMarkStudied}
              onGoToQuiz={() => {
                setTab('quiz');
                if (!quiz) loadQuiz();
              }}
            />
          )}

          {tab === 'quiz' && (
            <TopicQuizView
              item={item}
              quiz={quiz}
              loadingQuiz={loadingQuiz}
              currentQ={currentQ}
              setCurrentQ={setCurrentQ}
              answers={answers}
              setAnswers={setAnswers}
              selectedOpt={selectedOpt}
              setSelectedOpt={setSelectedOpt}
              quizTimer={quizTimer}
              submittingQuiz={submittingQuiz}
              onSubmitQuiz={handleSubmitQuiz}
              onLoadQuiz={loadQuiz}
            />
          )}

          {tab === 'analysis' && (
            <TopicAnalysisView
              result={quizResult}
              onRetake={() => {
                setTab('quiz');
                loadQuiz();
              }}
              onNextTopic={() => {
                onClose();
                if (onPathUpdate) onPathUpdate();
              }}
              onGoToRemedial={() => setTab('remedial')}
            />
          )}

          {tab === 'remedial' && (
            <TopicRemedialView
              remedialContent={contentData?.remedial_content || quizResult?.remedial_content}
              onRetakeQuiz={() => {
                setTab('quiz');
                loadQuiz();
              }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── MAIN LEARNING PATH PAGE ─────────────────────────────────────── */
export default function LearningPathPage() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [path, setPath] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadPath = async () => {
    setLoading(true);
    try {
      const res = await learningPathAPI.get();
      setPath(res.data.path);
      setItems(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPath(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await learningPathAPI.generate();
      setPath(res.data);
      setItems(res.data.items || []);
      toast.success('Your personalized learning path outline has been created! 🎯');
    } catch {
      toast.error('Failed to generate learning path.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartTopic = (item) => {
    if (item.status === 'locked') {
      toast.error('This topic is locked. Complete previous topics and pass their diagnostic quizzes first.');
      return;
    }
    setSelected(item);
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const overallPct = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="page-content">
        <AnimatePresence>
          {selected && (
            <TopicModal
              item={selected}
              onClose={() => setSelected(null)}
              onPathUpdate={loadPath}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="ai-badge" style={{ marginBottom: 10 }}>
                <Map size={12} /> Adaptive Topic-by-Topic Learning Path
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink, #12203A)', margin: '0 0 6px' }}>
                {path?.career_goal || 'Your Learning Roadmap'}
              </h1>
              <p style={{ color: 'var(--muted, #475569)', margin: '0 0 16px', fontSize: '0.94rem' }}>
                Strict sequential progression · {items.length} topics · {completedCount} completed · {overallPct}% done
              </p>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <><div className="spinner" style={{ width: 16, height: 16 }} />Generating Outline...</>
                ) : (
                  <><RefreshCw size={14} />Regenerate Roadmap Outline</>
                )}
              </button>
            </div>

            {/* 3D Knowledge Spire Visualizer */}
            <div>
              <LearningPath3DSpire height={180} />
            </div>
          </div>

          {/* Overall progress bar */}
          {items.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted, #475569)', fontWeight: 600 }}>Curriculum Mastery Progress</span>
                <span style={{ fontSize: '0.8rem', color: '#2557E0', fontWeight: 800 }}>{overallPct}%</span>
              </div>
              <div className="progress-bar-track" style={{ height: 8 }}>
                <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 78, borderRadius: 14 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            border: '1px dashed var(--line, rgba(18, 32, 58, 0.2))',
            borderRadius: 16,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🗺️</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>
              No Learning Path Roadmap Yet
            </h2>
            <p style={{ color: 'var(--muted, #475569)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Complete your profile and diagnostic assessment, then generate your sequential AI roadmap.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => navigate('/onboarding')}>
                Complete Profile
              </button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                <Zap size={14} />
                {generating ? 'Generating...' : 'Generate Roadmap'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Main Path Sequence */}
            <div style={{ flex: 1, minWidth: 'min(100%, 600px)' }}>
              {/* Important Policy Notification */}
              <div style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(37, 87, 224, 0.05)',
                border: '1px solid rgba(37, 87, 224, 0.15)',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <AlertCircle size={18} color="#2557E0" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', color: 'var(--ink, #0B1220)' }}>
                  <strong>One-Topic-at-a-Time Rule:</strong> Each topic provides complete detailed content and a 30-question diagnostic quiz. Complete and pass each topic to unlock the next.
                </span>
              </div>

              {/* Topics Sequence */}
              {items.map((item, i) => {
                const isLocked = item.status === 'locked';
                const isCompleted = item.status === 'completed';
                const isActive = item.status === 'in_progress' || item.status === 'available';

                return (
                  <div key={item.id}>
                    <motion.div
                      className={`path-node ${item.status}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => handleStartTopic(item)}
                      style={{
                        padding: '18px 20px',
                        borderRadius: 14,
                        border: `1.5px solid ${isCompleted ? 'rgba(5,150,105,0.3)' : isActive ? 'rgba(37,87,224,0.4)' : 'rgba(18,32,58,0.1)'}`,
                        background: isCompleted ? 'rgba(5,150,105,0.02)' : isActive ? 'rgba(37,87,224,0.03)' : 'rgba(18,32,58,0.02)',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        opacity: isLocked ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Topic Number & Status Icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isCompleted ? 'rgba(5,150,105,0.15)' : isActive ? 'rgba(37,87,224,0.15)' : 'rgba(18,32,58,0.06)',
                        border: `2px solid ${isCompleted ? '#059669' : isActive ? '#2557E0' : 'rgba(18,32,58,0.15)'}`,
                      }}>
                        {isCompleted ? <CheckCircle size={20} color="#059669" />
                          : isActive ? <Play size={16} color="#2557E0" />
                            : <Lock size={16} color="var(--muted, #475569)" />}
                      </div>

                      {/* Topic Information */}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--muted, #475569)', fontWeight: 700 }}>
                            TOPIC {i + 1}
                          </span>
                          <span style={{
                            fontSize: '1rem', fontWeight: 800,
                            color: isLocked ? 'var(--muted, #475569)' : 'var(--ink, #0B1220)',
                          }}>
                            {item.topic_name}
                          </span>
                          {isActive && (
                            <span style={{
                              padding: '2px 8px', borderRadius: 20,
                              background: 'rgba(37,87,224,0.15)', color: '#2557E0',
                              fontSize: '0.68rem', fontWeight: 700,
                            }}>
                              ACTIVE
                            </span>
                          )}
                          {isCompleted && (
                            <span style={{
                              padding: '2px 8px', borderRadius: 20,
                              background: 'rgba(5,150,105,0.15)', color: '#059669',
                              fontSize: '0.68rem', fontWeight: 700,
                            }}>
                              MASTERED
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.84rem', color: 'var(--muted, #475569)', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ textTransform: 'capitalize' }}>{item.difficulty}</span>
                          <span>·</span>
                          <span>{item.estimated_hours}h estimated</span>
                          <span>·</span>
                          <span>30 Quiz Questions</span>
                        </div>
                      </div>

                      {/* Right Action Trigger */}
                      <div>
                        {isLocked ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted, #475569)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock size={12} /> Locked
                          </span>
                        ) : (
                          <button
                            className="btn btn-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTopic(item);
                            }}
                            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                          >
                            {isCompleted ? 'Review Topic' : 'Open Lesson'} <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </motion.div>

                    {/* Step Connector */}
                    {i < items.length - 1 && (
                      <div style={{
                        width: 2, height: 20,
                        background: isCompleted ? '#059669' : 'rgba(18, 32, 58, 0.12)',
                        margin: '0 0 0 41px',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Side Roadmap Overview */}
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{
                padding: '20px', borderRadius: 14,
                background: 'var(--paper, #ffffff)',
                border: '1px solid var(--line, rgba(18, 32, 58, 0.12))',
                marginBottom: 20,
              }}>
                <h3 style={{ fontWeight: 800, color: 'var(--ink, #0B1220)', fontSize: '1rem', marginBottom: 14 }}>
                  Curriculum Status
                </h3>
                {[
                  { label: 'Total Modules', value: items.length },
                  { label: 'Mastered Topics', value: completedCount, color: '#059669' },
                  { label: 'In Progress', value: items.filter(i => i.status === 'in_progress' || i.status === 'available').length, color: '#2557E0' },
                  { label: 'Locked Modules', value: items.filter(i => i.status === 'locked').length, color: 'var(--muted, #475569)' },
                  { label: 'Total Questions', value: `${items.length * 30} Qs` },
                ].map((s) => (
                  <div key={s.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
                  }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--muted, #475569)' }}>{s.label}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: s.color || 'var(--ink, #0B1220)' }}>
                      {s.value}
                    </span>
                  </div>
                ))}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}
                  onClick={() => {
                    const activeTopic = items.find((i) => i.status === 'in_progress' || i.status === 'available') || items[0];
                    if (activeTopic) setSelected(activeTopic);
                  }}
                >
                  <Zap size={15} /> Continue Current Topic
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
