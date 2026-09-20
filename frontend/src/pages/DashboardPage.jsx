import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, BookOpen, Zap, Target, Clock,
  Award, ChevronRight, Sparkles, AlertCircle, BarChart2,
  Play, CheckCircle, Lock, Compass, Eye, Search, Layers
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import useAuthStore from '../store/authStore';
import { aiAPI, learningPathAPI } from '../services/api';
import LearningScene from '../components/dashboard/LearningScene';
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassChip,
  GlassProgressBar,
  GlassModal,
  GlassNavbar
} from '../components/ui/GlassComponents';

// ─── CIRCULAR PROGRESS WITH TRANSLUCENT GLOW ───
function CircularProgress({ value, size = 100, stroke = 8, color = '#2F5BFF' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = (pct / 100) * circ;

  return (
    <div className="circle-progress" style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(18, 32, 58, 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: 'drop-shadow(0 2px 6px rgba(47, 91, 255, 0.25))' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color: 'var(--ink, #12203A)', fontFamily: 'JetBrains Mono, monospace' }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

// ─── SKILL BAR WITH GLASS GRADIENT ─────────────
function SkillBar({ name, current, required, color = '#2F5BFF' }) {
  return (
    <div className="skill-item">
      <div className="skill-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="skill-name" style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--ink, #12203A)' }}>{name}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color, fontWeight: 700, fontSize: '0.86rem' }}>{Math.round(current)}%</span>
          <span style={{ fontSize: '0.74rem', color: 'var(--muted, #56657F)' }}>/ {required}% target</span>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <div className="glass-progress-track">
          <div
            className="glass-progress-fill"
            style={{
              width: `${current}%`,
              background: current >= 70
                ? 'linear-gradient(90deg, #10B981, #06B6D4)'
                : current >= 40
                ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                : 'linear-gradient(90deg, #2F5BFF, #60A5FA)',
            }}
          />
        </div>
        {/* Target requirement marker line */}
        <div style={{
          position: 'absolute', top: -2, bottom: -2,
          left: `${required}%`, width: 2,
          background: 'var(--ink, #12203A)',
          opacity: 0.45,
          borderRadius: 1,
          transform: 'translateX(-50%)',
        }} />
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, fetchProfile } = useAuthStore();
  const [skillGap, setSkillGap] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(true);

  // Demo modal state for showcasing all glass components
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoInput, setDemoInput] = useState('Full Stack AI Engineer');
  const [demoProgress, setDemoProgress] = useState(68);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchProfile();
        const [gapRes, recRes, pathRes] = await Promise.allSettled([
          aiAPI.skillGap(),
          aiAPI.recommendations(),
          learningPathAPI.get(),
        ]);
        if (gapRes.status === 'fulfilled') setSkillGap(gapRes.value.data);
        if (recRes.status === 'fulfilled') setRecommendations(recRes.value.data.recommendations || []);
        if (pathRes.status === 'fulfilled') setLearningPath(pathRes.value.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchProfile]);

  const prof = profile?.profile;
  const progress = prof?.overall_progress || 0;
  const dailyGoal = prof?.daily_learning_minutes || 60;
  const minutesLearned = prof?.total_learning_minutes || 0;
  const careerGoal = prof?.career_goal;
  const onboardingDone = prof?.onboarding_completed;
  const assessmentDone = prof?.assessment_completed;

  const pathItems = learningPath?.items || [];
  const currentTopic = pathItems.find((i) => i.status === 'in_progress');
  const nextTopic = pathItems.find((i) => i.status === 'available');

  const hasSkillData = skillGap && skillGap.status !== 'no_data' && Object.keys(skillGap.skill_levels || {}).length > 0;
  const SKILL_DATA = hasSkillData
    ? Object.entries(skillGap.skill_levels).map(([name, current]) => ({
        name,
        current,
        required: skillGap.required_levels?.[name] || 85,
        color: current >= 70 ? '#10B981' : current >= 40 ? '#F59E0B' : '#2F5BFF',
      }))
    : [];

  // Topics for 3D model (derived from authentic student learning path)
  const trailTopics = useMemo(() => {
    if (pathItems.length > 0) {
      return pathItems.slice(0, 8).map((item) => ({
        id: item.id,
        name: item.topic_name,
        status: item.status,
        difficulty: item.difficulty,
        reason: item.topic_description || 'Personalized module based on your diagnostic evaluation',
      }));
    }
    return [];
  }, [pathItems]);

  const trailProgress = useMemo(() => {
    if (pathItems.length > 0) {
      const completed = pathItems.filter((i) => i.status === 'completed').length;
      return completed + (currentTopic ? 0.62 : 0);
    }
    return 0;
  }, [pathItems, currentTopic]);

  return (
    <DashboardLayout>
      {/* ─── 3D MODEL FIXED IN BACKGROUND (NO TEXT) ─── */}
      <LearningScene progress={trailProgress} />

      {/* ─── DASHBOARD CONTENT (OPEN LAYOUT) ─── */}
      <div className="page-content" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
        {/* Onboarding Prompts (Open Layout Alert Banners) */}
        {!onboardingDone && (
          <div
            style={{
              marginBottom: 20,
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              borderLeft: '4px solid #D97706',
              borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
              background: 'transparent',
            }}
            onClick={() => navigate('/onboarding')}
          >
            <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '0.92rem', marginBottom: 2 }}>
                Complete Your Profile & Select Career Goal
              </div>
              <div style={{ color: 'var(--muted, #3E4D68)', fontSize: '0.84rem' }}>
                Set up your education and career goal to prepare your AI assessment.
              </div>
            </div>
            <ChevronRight size={18} color="#D97706" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </div>
        )}

        {onboardingDone && !assessmentDone && (
          <div
            style={{
              marginBottom: 20,
              padding: '14px 18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              borderLeft: '4px solid #2557E0',
              borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
              background: 'transparent',
            }}
            onClick={() => navigate('/assessment')}
          >
            <Brain size={20} color="#2557E0" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '0.92rem', marginBottom: 2 }}>
                Take Your AI Skill Assessment
              </div>
              <div style={{ color: 'var(--muted, #3E4D68)', fontSize: '0.84rem' }}>
                Personalized questions dynamically generated by AI to build your learning path.
              </div>
            </div>
            <ChevronRight size={18} color="#2557E0" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </div>
        )}

        {/* Header with Title */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading, "Bricolage Grotesque", sans-serif)',
                  color: 'var(--ink, #0B1220)',
                  margin: '0 0 6px',
                  letterSpacing: '-0.02em',
                }}
              >
                {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Student'} 👋
              </h1>
              <p style={{ color: 'var(--muted, #3E4D68)', fontSize: '0.94rem', margin: 0 }}>
                Career Goal: <span style={{ color: '#2557E0', fontWeight: 700 }}>{careerGoal || 'Not selected'}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── MINIMAL DASHBOARD STATISTICS (NON-CARD) ─── */}
        <div className="stats-minimal-container">
          {/* 1. Overall Progress */}
          <div className="stats-minimal-item">
            <CircularProgress value={progress} size={54} stroke={5} color="#2557E0" />
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--muted, #3E4D68)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Overall Progress
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink, #0B1220)' }}>
                {Math.round(progress)}%
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--muted, #3E4D68)' }}>
                {pathItems.length > 0
                  ? `${pathItems.filter(i => i.status === 'completed').length}/${pathItems.length} topics`
                  : '0% completed'}
              </div>
            </div>
          </div>

          <div className="stats-minimal-divider" />

          {/* 2. Current Topic */}
          <div className="stats-minimal-item">
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(2, 132, 199, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BookOpen size={20} color="#0284C7" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--muted, #3E4D68)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Current Topic
              </div>
              <div style={{
                fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #0B1220)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220
              }}>
                {currentTopic?.topic_name || nextTopic?.topic_name || 'Not started'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--muted, #3E4D68)' }}>
                {currentTopic?.difficulty || 'No active topic'}
              </div>
            </div>
          </div>

          <div className="stats-minimal-divider" />

          {/* 3. Daily Goal */}
          <div className="stats-minimal-item">
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(5, 150, 105, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Clock size={20} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--muted, #3E4D68)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Daily Goal
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink, #0B1220)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {minutesLearned}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted, #3E4D68)' }}>/ {dailyGoal} min</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--muted, #3E4D68)' }}>
                {dailyGoal > 0 ? `${Math.min(100, Math.round((minutesLearned / dailyGoal) * 100))}% complete` : '0 min'}
              </div>
            </div>
          </div>

          <div className="stats-minimal-divider" />

          {/* 4. Learning Streak */}
          <div className="stats-minimal-item">
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(217, 119, 6, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Award size={20} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--muted, #3E4D68)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Learning Streak
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--ink, #0B1220)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {prof?.streak_days || 0}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted, #3E4D68)' }}>days 🔥</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--muted, #3E4D68)' }}>
                {prof?.streak_days ? 'Keep it up!' : 'Start streak today'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT: SKILL GAP & LEARNING PATH (OPEN LAYOUT) ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32, marginBottom: 32 }}>
          {/* Skill Gap Section */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: 'var(--ink, #0B1220)', fontSize: '1.15rem', margin: 0, fontFamily: 'var(--font-heading)' }}>
                    Skill Gap Analysis
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--muted, #3E4D68)', margin: '4px 0 0' }}>
                    {careerGoal ? `Assessed vs. Required for ${careerGoal}` : 'Assessment results'}
                  </p>
                </div>
                {hasSkillData && (
                  <GlassChip variant="primary">AI Analyzed</GlassChip>
                )}
              </div>

              {SKILL_DATA.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {SKILL_DATA.slice(0, 6).map((skill, i) => (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                    >
                      <SkillBar {...skill} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 16px', borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
                  <h4 style={{ color: 'var(--ink, #0B1220)', fontWeight: 700, fontSize: '0.98rem', marginBottom: 6 }}>Skills: No data</h4>
                  <p style={{ color: 'var(--muted, #3E4D68)', fontSize: '0.85rem', maxWidth: 320, margin: '0 auto 16px' }}>
                    Complete your profile and skill assessment to generate your personalized skill breakdown.
                  </p>
                  <GlassButton
                    variant="secondary"
                    onClick={() => navigate(onboardingDone ? '/assessment' : '/onboarding')}
                    style={{ fontSize: '0.84rem', padding: '8px 16px' }}
                  >
                    {onboardingDone ? 'Take Assessment' : 'Complete Profile'}
                  </GlassButton>
                </div>
              )}

              {skillGap?.ai_summary && hasSkillData && (
                <div style={{
                  marginTop: 18, padding: '12px 16px',
                  borderLeft: '3px solid #2557E0',
                  background: 'transparent',
                  fontSize: '0.86rem', color: 'var(--ink, #0B1220)', lineHeight: 1.6,
                }}>
                  💡 {skillGap.ai_summary}
                </div>
              )}
            </div>
          </motion.div>

          {/* Learning Path Preview Section */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: 'var(--ink, #0B1220)', fontSize: '1.15rem', margin: 0, fontFamily: 'var(--font-heading)' }}>
                    Personalized Learning Path
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--muted, #3E4D68)', margin: '4px 0 0' }}>
                    {pathItems.length > 0 ? `${pathItems.length} topics dynamically generated` : 'Dynamic roadmap'}
                  </p>
                </div>
                {pathItems.length > 0 && (
                  <button
                    onClick={() => navigate('/learning-path')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#2557E0',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    View All <ChevronRight size={16} />
                  </button>
                )}
              </div>

              {pathItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗺️</div>
                  <h4 style={{ color: 'var(--ink, #0B1220)', fontWeight: 700, fontSize: '0.98rem', marginBottom: 6 }}>Learning Path: Not generated</h4>
                  <p style={{ color: 'var(--muted, #3E4D68)', fontSize: '0.85rem', maxWidth: 320, margin: '0 auto 16px' }}>
                    Complete your profile and skill assessment to generate your personalized learning path.
                  </p>
                  <GlassButton
                    variant="primary"
                    onClick={() => navigate(onboardingDone ? '/assessment' : '/onboarding')}
                    style={{ fontSize: '0.84rem', padding: '8px 16px' }}
                  >
                    {onboardingDone ? 'Take Assessment' : 'Start Onboarding'}
                  </GlassButton>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {pathItems.slice(0, 5).map((item, i) => (
                    <div
                      key={item.id}
                      onClick={() => navigate('/learning-path')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 6px',
                        borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.status === 'completed' ? '#DCFCE7'
                          : item.status === 'in_progress' ? '#DBEAFE'
                            : 'rgba(18, 32, 58, 0.05)',
                      }}>
                        {item.status === 'completed' ? <CheckCircle size={15} color="#16A34A" />
                          : item.status === 'in_progress' ? <Play size={12} color="#2563EB" />
                            : <Lock size={12} color="var(--muted, #3E4D68)" />}
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          fontSize: '0.9rem', fontWeight: 600,
                          color: item.status === 'locked' ? 'var(--muted, #3E4D68)' : 'var(--ink, #0B1220)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {item.topic_name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--muted, #3E4D68)' }}>
                          {item.estimated_hours}h · {item.difficulty}
                        </div>
                      </div>

                      <div>
                        {item.status === 'completed' && <GlassChip variant="teal">Done</GlassChip>}
                        {item.status === 'in_progress' && <GlassChip variant="primary">Active</GlassChip>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ─── AI RECOMMENDATIONS (CLEAN OPEN GRID) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{ marginBottom: 32, borderTop: '1px solid var(--line, rgba(18, 32, 58, 0.08))', paddingTop: 24 }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontWeight: 800, color: 'var(--ink, #0B1220)', fontSize: '1.15rem', margin: 0, fontFamily: 'var(--font-heading)' }}>
                AI Recommendations <GlassChip variant="primary" style={{ marginLeft: 8 }}>Dynamic</GlassChip>
              </h3>
            </div>

            {recommendations.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                {recommendations.slice(0, 3).map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '16px 14px',
                      background: 'transparent',
                      borderLeft: '3px solid #2557E0',
                      borderBottom: '1px solid var(--line, rgba(18, 32, 58, 0.08))',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <GlassChip
                        variant={rec.type === 'topic' ? 'primary' : rec.type === 'resource' ? 'teal' : 'amber'}
                      >
                        {rec.type}
                      </GlassChip>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '0.95rem', marginBottom: 6 }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--muted, #3E4D68)', lineHeight: 1.55, marginBottom: 10 }}>
                      {rec.description}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#2557E0', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <Zap size={13} color="#2557E0" /> {rec.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎯</div>
                <h4 style={{ color: 'var(--ink, #0B1220)', fontWeight: 700, fontSize: '0.98rem', marginBottom: 6 }}>Recommendations: Not available</h4>
                <p style={{ color: 'var(--muted, #3E4D68)', fontSize: '0.85rem', maxWidth: 400, margin: '0 auto 16px' }}>
                  Complete your profile and skill assessment to generate your personalized recommendations.
                </p>
                <GlassButton
                  variant="secondary"
                  onClick={() => navigate(onboardingDone ? '/assessment' : '/onboarding')}
                >
                  {onboardingDone ? 'Take Assessment' : 'Complete Profile'}
                </GlassButton>
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── QUICK ACTIONS (GLASS BUTTONS) ─── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Learning Path', icon: Compass, path: '/learning-path' },
            { label: 'Chat with AI Tutor', icon: Brain, path: '/tutor' },
            { label: 'View Analytics', icon: BarChart2, path: '/analytics' },
            { label: 'Skill Assessment', icon: Target, path: '/assessment' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <GlassButton
                key={action.label}
                variant="secondary"
                onClick={() => navigate(action.path)}
                style={{ padding: '9px 18px' }}
              >
                <Icon size={15} color="#2F5BFF" />
                {action.label}
              </GlassButton>
            );
          })}
        </div>
      </div>

      {/* ─── GLASS UI TOUR & COMPONENT DEMO MODAL ─── */}
      <GlassModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        title="Translucent White Glass UI Showcase"
        maxWidth={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted, #56657F)', lineHeight: 1.6 }}>
            Demonstrating all requested glassmorphism primitives: translucent backdrop blur, subtle inner highlights, high-contrast typography, and accessible keyboard focus states.
          </p>

          {/* 1. Glass Navbar Demo */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted, #56657F)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              1. Glass Navbar Component
            </div>
            <GlassNavbar style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink, #12203A)' }}>
                <Zap size={16} color="#2F5BFF" /> GlassNav
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <GlassChip variant="primary">Dashboard</GlassChip>
                <GlassChip variant="default">Analytics</GlassChip>
              </div>
            </GlassNavbar>
          </div>

          {/* 2. Glass Input Demo */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted, #56657F)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              2. Glass Input with Focus Ring
            </div>
            <GlassInput
              icon={Search}
              placeholder="Search topic or career target..."
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
            />
          </div>

          {/* 3. Glass Chips / Tags Demo */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted, #56657F)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              3. Glass Chips & Pills (8px blur)
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <GlassChip variant="primary" icon={Sparkles}>AI Selected</GlassChip>
              <GlassChip variant="amber">In Progress (62%)</GlassChip>
              <GlassChip variant="teal">Completed Quiz</GlassChip>
              <GlassChip variant="default">System Design</GlassChip>
            </div>
          </div>

          {/* 4. Glass Progress Bar Demo */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted, #56657F)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              4. Glass Progress Bar (Blue-to-Teal Gradient)
            </div>
            <GlassProgressBar value={demoProgress} showLabel />
          </div>

          {/* 5. Glass Buttons Demo */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted, #56657F)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              5. Glass Buttons (Primary & Secondary)
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <GlassButton variant="primary" onClick={() => setDemoProgress((p) => (p >= 100 ? 10 : p + 15))}>
                <Zap size={14} /> Update Progress (+15%)
              </GlassButton>
              <GlassButton variant="secondary" onClick={() => setDemoModalOpen(false)}>
                Close Preview
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassModal>
    </DashboardLayout>
  );
}
