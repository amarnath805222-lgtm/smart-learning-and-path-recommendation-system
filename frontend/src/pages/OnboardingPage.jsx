import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Zap, Check, Brain } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { studentAPI } from '../services/api';

const CAREER_GOALS = [
  'AI/ML Engineer', 'Data Scientist', 'Deep Learning Researcher',
  'Computer Vision Engineer', 'NLP Engineer', 'Data Analyst',
  'Full-Stack Developer', 'Backend Developer', 'DevOps Engineer',
];

const SKILLS = [
  'Python', 'JavaScript', 'Java', 'C++', 'R',
  'SQL', 'TensorFlow', 'PyTorch', 'Scikit-learn',
  'NumPy', 'Pandas', 'Matplotlib',
];

const INTERESTS = [
  'Machine Learning', 'Deep Learning', 'Computer Vision',
  'NLP / Text AI', 'Data Analysis', 'Robotics',
  'Reinforcement Learning', 'Statistics', 'Mathematics',
];

const LEARNING_STYLES = [
  { id: 'video', emoji: '🎥', label: 'Video Courses' },
  { id: 'reading', emoji: '📖', label: 'Articles & Docs' },
  { id: 'hands_on', emoji: '🛠️', label: 'Hands-on Projects' },
  { id: 'mixed', emoji: '🎯', label: 'Mixed (Recommended)' },
];

const EDUCATION_LEVELS = [
  { id: 'high_school', label: 'High School' },
  { id: 'undergraduate', label: 'Undergraduate' },
  { id: 'postgraduate', label: 'Postgraduate' },
  { id: 'professional', label: 'Professional' },
];

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div className={`step-dot ${i < current ? 'completed' : i === current ? 'active' : 'pending'}`}>
            {i < current ? <Check size={13} /> : i + 1}
          </div>
          {i < total - 1 && <div className={`step-line ${i < current ? 'done' : ''}`} style={{ width: 40 }} />}
        </div>
      ))}
    </div>
  );
}

const STEPS = ['Profile', 'Skills', 'Career Goal', 'Preferences', 'Summary'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { fetchProfile, user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState({
    education_level: '',
    branch: '',
    career_goal: '',
    daily_learning_minutes: 60,
    learning_style: 'mixed',
    programming_languages: [],
    interests: [],
    completed_courses: '',
    current_skill_level: 'beginner',
  });

  const update = (key, val) => setData((d) => ({ ...d, [key]: val }));

  const toggleArray = (key, val) => {
    setData((d) => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter((x) => x !== val) : [...d[key], val],
    }));
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        completed_courses: data.completed_courses ? data.completed_courses.split(',').map((s) => s.trim()) : [],
        onboarding_completed: true,
      };
      await studentAPI.updateProfile(payload);
      await fetchProfile();
      toast.success('Profile saved! Generating your learning path... 🚀');
      navigate('/assessment');
    } catch (err) {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Profile
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Education Level</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EDUCATION_LEVELS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={`skill-chip ${data.education_level === e.id ? 'selected' : ''}`}
                    onClick={() => update('education_level', e.id)}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Branch / Degree / Field</label>
              <input
                className="input"
                type="text"
                placeholder="e.g., Computer Science, Data Science, ECE"
                value={data.branch}
                onChange={(e) => update('branch', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Current Skill Level</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`skill-chip ${data.current_skill_level === lvl ? 'selected' : ''}`}
                    onClick={() => update('current_skill_level', lvl)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 1: // Skills
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="input-group">
              <label className="input-label">Programming Languages / Tools You Know</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`skill-chip ${data.programming_languages.includes(s) ? 'selected' : ''}`}
                    onClick={() => toggleArray('programming_languages', s)}
                  >
                    {data.programming_languages.includes(s) && <Check size={11} />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Topics You're Interested In</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {INTERESTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`skill-chip ${data.interests.includes(s) ? 'selected' : ''}`}
                    onClick={() => toggleArray('interests', s)}
                  >
                    {data.interests.includes(s) && <Check size={11} />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Courses / Certifications Completed (optional)</label>
              <input
                className="input"
                type="text"
                placeholder="e.g., CS50, Andrew Ng ML Course (comma-separated)"
                value={data.completed_courses}
                onChange={(e) => update('completed_courses', e.target.value)}
              />
            </div>
          </div>
        );

      case 2: // Career Goal
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted, #56657F)', marginBottom: 4 }}>
              Choose your primary career goal. Your learning path will be tailored to this.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {CAREER_GOALS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => update('career_goal', goal)}
                  style={{
                    padding: '14px 16px',
                    background: data.career_goal === goal
                      ? 'rgba(47,91,255,0.12)'
                      : 'transparent',
                    border: `1px solid ${data.career_goal === goal ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: data.career_goal === goal ? '#2F5BFF' : 'var(--ink, #0B1220)',
                    fontWeight: data.career_goal === goal ? 600 : 500,
                    fontSize: '0.88rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {data.career_goal === goal && (
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#2F5BFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Check size={11} color="white" />
                    </div>
                  )}
                  {goal}
                </button>
              ))}
            </div>
          </div>
        );

      case 3: // Preferences
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="input-group">
              <label className="input-label" style={{ color: 'var(--ink, #0B1220)', fontWeight: 600 }}>Daily Learning Time</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range"
                  min={15} max={240} step={15}
                  value={data.daily_learning_minutes}
                  onChange={(e) => update('daily_learning_minutes', parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: '#2F5BFF' }}
                />
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '1rem', fontWeight: 700,
                  color: '#2F5BFF', minWidth: 60, textAlign: 'right',
                }}>
                  {data.daily_learning_minutes}m
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted, #56657F)', fontSize: '0.75rem', marginTop: 2 }}>
                <span>15 min</span><span>4 hours</span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" style={{ color: 'var(--ink, #0B1220)', fontWeight: 600 }}>Preferred Learning Style</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {LEARNING_STYLES.map((ls) => (
                  <button
                    key={ls.id}
                    type="button"
                    onClick={() => update('learning_style', ls.id)}
                    style={{
                      padding: 16,
                      background: data.learning_style === ls.id
                        ? 'rgba(47,91,255,0.12)' : 'transparent',
                      border: `1px solid ${data.learning_style === ls.id ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                      borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{ls.emoji}</div>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 600,
                      color: data.learning_style === ls.id ? '#2F5BFF' : 'var(--ink, #0B1220)',
                    }}>
                      {ls.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4: // Summary
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'transparent',
              border: '1px solid var(--bdr, #E2E8F0)',
              borderLeft: '4px solid #2F5BFF',
              borderRadius: 12, padding: 20, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Brain size={20} color="#2F5BFF" />
                <span style={{ fontWeight: 700, color: 'var(--ink, #0B1220)' }}>Your Profile Summary</span>
              </div>
              {[
                ['Career Goal', data.career_goal || 'Not set'],
                ['Education', data.education_level?.replace('_', ' ') || 'Not set'],
                ['Branch', data.branch || 'Not set'],
                ['Skill Level', data.current_skill_level],
                ['Daily Time', `${data.daily_learning_minutes} minutes`],
                ['Learning Style', data.learning_style?.replace('_', ' ')],
                ['Known Skills', data.programming_languages.join(', ') || 'None selected'],
                ['Interests', data.interests.join(', ') || 'None selected'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--bdr, #E2E8F0)',
                  gap: 12,
                }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted, #56657F)', flexShrink: 0 }}>{label}</span>
                  <span style={{
                    fontSize: '0.85rem', color: 'var(--ink, #0B1220)', fontWeight: 600,
                    textAlign: 'right', textTransform: 'capitalize',
                  }}>{value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted, #56657F)', lineHeight: 1.6, textAlign: 'center' }}>
              After saving, you'll take a quick AI-powered skill assessment to personalize your learning path further.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="onboarding-layout">
      {/* BG orbs */}
      <div className="glow-orb glow-orb-primary" style={{ width: 400, height: 400, top: -100, right: -100, opacity: 0.2 }} />
      <div className="glow-orb glow-orb-accent" style={{ width: 350, height: 350, bottom: -100, left: -100, opacity: 0.15 }} />

      <div className="onboarding-card">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="ai-badge" style={{ justifyContent: 'center', marginBottom: 16 }}>
            <Zap size={12} />
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </div>
          <StepIndicator current={step} total={STEPS.length} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink, #0B1220)', marginBottom: 4 }}>
            {step === 0 && 'Tell us about yourself'}
            {step === 1 && 'What do you already know?'}
            {step === 2 && 'What\'s your career goal?'}
            {step === 3 && 'How do you like to learn?'}
            {step === 4 && 'Everything looks great!'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted, #56657F)' }}>
            {step < 4 ? 'This helps us personalize your AI learning path.' : 'Review your profile before we start the assessment.'}
          </p>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            style={{ marginBottom: 28 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button
            className="btn btn-outline"
            onClick={prev}
            disabled={step === 0}
            style={{ flex: 1 }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={next}
              style={{ flex: 2 }}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleFinish}
              disabled={saving}
              style={{ flex: 2 }}
            >
              {saving ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} />Saving...</>
              ) : (
                <><Zap size={16} />Start Assessment</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
