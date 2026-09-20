import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, AreaChart, Area,
} from 'recharts';
import { BarChart2, TrendingUp, Target, Clock, Brain, Award } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { analyticsAPI } from '../services/api';

const TOOLTIP_STYLE = {
  background: 'var(--paper, #ffffff)',
  border: '1px solid var(--bdr, #E2E8F0)',
  borderRadius: 8,
  color: 'var(--ink, #0B1220)',
  fontSize: '0.8rem',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await analyticsAPI.get();
        setData(res.data);
      } catch {
        console.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const overview = data?.overview || {};
  const weeklyProgress = data?.weekly_progress || [];
  const skillRadar = data?.skill_radar || [];
  const topicProgress = data?.topic_progress || [];
  const quizTrend = data?.quiz_trend || [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--bdr, #E2E8F0)' }}>
          <div className="ai-badge" style={{ marginBottom: 10 }}><BarChart2 size={12} /> Analytics</div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--ink, #0B1220)' }}>Progress Analytics</h1>
          <p style={{ color: 'var(--muted, #56657F)', marginTop: 4, fontSize: '0.9rem' }}>
            Track your learning journey and performance trends
          </p>
        </div>

        {/* Overview stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: TrendingUp, label: 'Overall Progress', value: `${Math.round(overview.overall_progress || 0)}%`, color: '#2F5BFF' },
            { icon: Award, label: 'Learning Streak', value: `${overview.streak_days || 0} days 🔥`, color: '#f59e0b' },
            { icon: Clock, label: 'Total Learning Time', value: `${Math.round((overview.total_learning_minutes || 0) / 60 * 10) / 10}h`, color: '#06b6d4' },
            { icon: Target, label: 'Topics Completed', value: `${overview.topics_completed || 0}/${overview.total_topics || 0}`, color: '#10b981' },
            { icon: Brain, label: 'Quizzes Taken', value: overview.quizzes_taken || 0, color: '#ef4444' },
            { icon: BarChart2, label: 'Avg Quiz Score', value: `${Math.round(overview.avg_quiz_score || 0)}%`, color: '#2F5BFF' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, marginBottom: 10,
                  background: `${stat.color}15`, border: `1px solid ${stat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} color={stat.color} />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink, #0B1220)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted, #56657F)', marginTop: 2 }}>{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Charts row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Weekly Progress Line Chart */}
          <div className="chart-container">
            <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '0.95rem', marginBottom: 16 }}>
              Weekly Learning Progress
            </h3>
            {weeklyProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weeklyProgress}>
                  <defs>
                    <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F5BFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2F5BFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="minGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr, #E2E8F0)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--muted, #56657F)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted, #56657F)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--muted, #56657F)' }} />
                  <Area type="monotone" dataKey="progress" stroke="#2F5BFF" fill="url(#progGrad)" strokeWidth={2} name="Progress %" />
                  <Area type="monotone" dataKey="minutes" stroke="#06b6d4" fill="url(#minGrad)" strokeWidth={2} name="Minutes" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted, #56657F)', fontSize: '0.85rem' }}>
                <p style={{ marginBottom: 4 }}>📈 No learning sessions recorded yet</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted, #56657F)' }}>Complete daily topics and quizzes to view your progress trend</p>
              </div>
            )}
          </div>

          {/* Skill Radar */}
          <div className="chart-container">
            <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '0.95rem', marginBottom: 16 }}>
              Skill Coverage Radar
            </h3>
            {skillRadar.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={skillRadar}>
                  <PolarGrid stroke="var(--bdr, #E2E8F0)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--muted, #56657F)', fontSize: 11 }} />
                  <Radar
                    name="Your Skills"
                    dataKey="value"
                    stroke="#2F5BFF"
                    fill="#2F5BFF"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted, #56657F)', fontSize: '0.85rem' }}>
                <p style={{ marginBottom: 4 }}>🎯 Skills: No data</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted, #56657F)' }}>Take the skill assessment to populate your radar chart</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Quiz Performance Bar */}
          <div className="chart-container">
            <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '0.95rem', marginBottom: 16 }}>
              Daily Learning Minutes
            </h3>
            {weeklyProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr, #E2E8F0)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--muted, #56657F)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted, #56657F)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="minutes" fill="url(#barGrad)" radius={[4, 4, 0, 0]} name="Minutes" />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2F5BFF" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted, #56657F)', fontSize: '0.85rem' }}>
                <p style={{ marginBottom: 4 }}>⏱️ 0 Minutes logged</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted, #56657F)' }}>Learning time will be tracked as you complete topics and quizzes</p>
              </div>
            )}
          </div>

          {/* Topic progress list */}
          <div className="chart-container">
            <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '0.95rem', marginBottom: 14 }}>
              Topic Progress
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {topicProgress.length > 0 ? topicProgress.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: t.status === 'completed' ? '#10B981'
                      : t.status === 'in_progress' ? '#2F5BFF'
                        : t.status === 'available' ? '#06B6D4' : 'var(--bdr, #CBD5E1)',
                  }} />
                  <span style={{
                    fontSize: '0.82rem',
                    color: t.status === 'locked' ? 'var(--muted, #56657F)' : 'var(--ink, #0B1220)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {t.name}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', flexShrink: 0,
                    color: t.status === 'completed' ? '#10B981' : 'var(--muted, #56657F)',
                    textTransform: 'uppercase', fontWeight: 600,
                  }}>
                    {t.status?.replace('_', ' ')}
                  </span>
                </div>
              )) : (
                <div style={{ color: 'var(--muted, #56657F)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                  Generate your learning path to see topic progress
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
