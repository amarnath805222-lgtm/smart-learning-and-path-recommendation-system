import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, Brain, BookOpen, BarChart2,
  MessageSquare, Mic, Settings, LogOut, ChevronLeft,
  Shield, Zap, Menu, Sun, Moon
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Map, label: 'Learning Path', path: '/learning-path' },
  { icon: Brain, label: 'AI Assessment', path: '/assessment' },
  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { icon: MessageSquare, label: 'AI Tutor', path: '/tutor' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarClass = [
    'sidebar',
    mobileOpen ? 'open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99, backdropFilter: 'blur(4px)',
          }}
          onClick={onClose}
        />
      )}

      <aside
        className={sidebarClass}
        style={{
          width: collapsed ? 72 : 260,
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(var(--glass-blur)) saturate(140%)',
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(140%)',
          borderRight: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(79,70,229,0.3)',
              }}>
                <Zap size={18} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink, #0f172a)' }}>SmartLearn</div>
                <div style={{ fontSize: '0.65rem', color: '#4f46e5', fontWeight: 600, letterSpacing: '0.06em' }}>AI POWERED</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              <Zap size={18} color="white" />
            </div>
          )}
          <button
            className="btn-icon"
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#64748b' }}
          >
            <ChevronLeft size={16} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: '#94a3b8', letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '8px 6px 6px',
            }}>
              Navigation
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <div
                key={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.path)}
                title={collapsed ? item.label : undefined}
                style={collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}}
              >
                <Icon size={18} className="nav-icon" />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#4f46e5',
                    marginLeft: 'auto',
                    boxShadow: '0 0 6px #4f46e5',
                  }} />
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--glass-border, #e2e8f0)', margin: '12px 0' }} />

          {/* Admin link if admin */}
          {user?.is_admin && (
            <div
              className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
              onClick={() => handleNav('/admin')}
              style={collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}}
            >
              <Shield size={18} className="nav-icon" />
              {!collapsed && <span>Admin Panel</span>}
            </div>
          )}
        </nav>

        {/* User section & Theme Toggle */}
        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid var(--glass-border, #e2e8f0)',
        }}>
          {/* Light / Dark Mode Toggle */}
          <div
            className="nav-item"
            onClick={toggleTheme}
            title={collapsed ? (theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode') : undefined}
            style={{
              marginBottom: 8,
              color: 'var(--ink, #0f172a)',
              background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
              border: '1px solid var(--glass-border, #e2e8f0)',
              borderRadius: 12,
              ...(collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}),
            }}
          >
            {theme === 'dark' ? (
              <Sun size={17} color="#F59E0B" className="nav-icon" />
            ) : (
              <Moon size={17} color="#4F46E5" className="nav-icon" />
            )}
            {!collapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: 8,
                  background: theme === 'dark' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(79, 70, 229, 0.1)',
                  color: theme === 'dark' ? '#F59E0B' : '#4F46E5',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}>
                  {theme}
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 6px', marginBottom: 4,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink, #0f172a)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.full_name || 'Student'}
                </div>
                <div style={{
                  fontSize: '0.72rem', color: 'var(--muted, #64748b)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.email || ''}
                </div>
              </div>
            </div>
          )}

          <div
            className="nav-item"
            onClick={handleLogout}
            style={{
              color: '#ff4d6d',
              ...(collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}),
            }}
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </div>
        </div>
      </aside>
    </>
  );
}
