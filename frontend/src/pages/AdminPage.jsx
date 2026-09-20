import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, BookOpen, BarChart2, Zap, Plus, X } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { adminAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [skills, setSkills] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', category: '', difficulty: 'beginner' });

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/dashboard');
      return;
    }
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const [studRes, skillRes, anaRes] = await Promise.allSettled([
        adminAPI.students(),
        adminAPI.skills(),
        adminAPI.analytics(),
      ]);
      if (studRes.status === 'fulfilled') setStudents(studRes.value.data.students || []);
      if (skillRes.status === 'fulfilled') setSkills(skillRes.value.data.skills || []);
      if (anaRes.status === 'fulfilled') setAnalytics(anaRes.value.data || {});
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.name || !newSkill.category) { toast.error('Name and category required'); return; }
    try {
      await adminAPI.createSkill(newSkill);
      toast.success('Skill added!');
      setShowAddSkill(false);
      setNewSkill({ name: '', category: '', difficulty: 'beginner' });
      load();
    } catch {
      toast.error('Failed to add skill');
    }
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'skills', label: 'Skills', icon: BookOpen },
  ];

  return (
    <DashboardLayout>
      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--bdr, #E2E8F0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Shield size={20} color="#F59E0B" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Admin Panel
            </span>
          </div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--ink, #0B1220)' }}>Administration</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
                  background: activeTab === tab.id ? 'rgba(47,91,255,0.12)' : 'transparent',
                  color: activeTab === tab.id ? '#2F5BFF' : 'var(--muted, #56657F)',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '0.875rem', transition: 'all 0.2s',
                  border: `1px solid ${activeTab === tab.id ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                }}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Total Students', value: analytics.total_students || 0, color: '#2F5BFF', emoji: '👥' },
              { label: 'Onboarded', value: analytics.onboarded_students || 0, color: '#10B981', emoji: '✅' },
              { label: 'Quiz Attempts', value: analytics.total_quiz_attempts || 0, color: '#06B6D4', emoji: '📝' },
              { label: 'Avg Quiz Score', value: `${analytics.avg_quiz_score || 0}%`, color: '#F59E0B', emoji: '🎯' },
              { label: 'Learning Paths', value: analytics.learning_paths_generated || 0, color: '#EF4444', emoji: '🗺️' },
              { label: 'API Status', value: 'Online', color: '#10B981', emoji: '🟢' },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{s.emoji}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted, #56657F)', marginTop: 4 }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Students */}
        {activeTab === 'students' && (
          <div style={{ padding: '8px 0' }}>
            <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 16, fontSize: '1.1rem' }}>
              All Students ({students.length})
            </h3>
            {students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted, #56657F)' }}>
                No students registered yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Career Goal</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--ink, #0B1220)', fontWeight: 600 }}>{s.full_name}</td>
                        <td style={{ color: 'var(--muted, #56657F)' }}>{s.email}</td>
                        <td style={{ color: 'var(--ink, #0B1220)' }}>{s.career_goal || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar-track" style={{ width: 60 }}>
                              <div className="progress-bar-fill" style={{ width: `${s.overall_progress || 0}%` }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted, #56657F)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {Math.round(s.overall_progress || 0)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${s.onboarding_completed ? 'badge-success' : 'badge-warning'}`}>
                            {s.onboarding_completed ? 'Active' : 'Setup Pending'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--muted, #56657F)' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Skills */}
        {activeTab === 'skills' && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--ink, #0B1220)', fontSize: '1.1rem' }}>Skills ({skills.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddSkill(true)}>
                <Plus size={14} /> Add Skill
              </button>
            </div>

            {showAddSkill && (
              <div style={{
                padding: '16px 20px', marginBottom: 20,
                background: 'transparent', borderRadius: 10,
                borderLeft: '4px solid #2F5BFF',
                borderTop: '1px solid var(--bdr, #E2E8F0)',
                borderRight: '1px solid var(--bdr, #E2E8F0)',
                borderBottom: '1px solid var(--bdr, #E2E8F0)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink, #0B1220)' }}>Add New Skill</span>
                  <button className="btn-icon" onClick={() => setShowAddSkill(false)} style={{ color: 'var(--muted, #56657F)' }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                  {['name', 'category'].map((field) => (
                    <input
                      key={field}
                      className="input"
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      value={newSkill[field]}
                      onChange={(e) => setNewSkill((s) => ({ ...s, [field]: e.target.value }))}
                    />
                  ))}
                  <select
                    className="input"
                    value={newSkill.difficulty}
                    onChange={(e) => setNewSkill((s) => ({ ...s, difficulty: e.target.value }))}
                    style={{ color: 'var(--ink, #0B1220)' }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddSkill}>
                  <Zap size={13} /> Create Skill
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {skills.map((skill) => (
                <div key={skill.id} style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--bdr, #E2E8F0)',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink, #0B1220)', fontSize: '0.9rem', marginBottom: 4 }}>{skill.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted, #56657F)' }}>{skill.category}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${skill.difficulty === 'beginner' ? 'badge-success' : skill.difficulty === 'intermediate' ? 'badge-warning' : 'badge-danger'}`}>
                      {skill.difficulty}
                    </span>
                  </div>
                </div>
              ))}
              {skills.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: 'var(--muted, #56657F)' }}>
                  No skills added yet. Add some to populate the platform.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
