import { useState } from 'react';
import Sidebar from '../components/ui/Sidebar';
import VoiceAssistant from '../components/voice/VoiceAssistant';
import { Menu } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { AmbientGlows } from '../components/ui/GlassComponents';

export default function DashboardLayout({ children, fullHeight = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile } = useAuthStore();

  const studentContext = {
    name: user?.full_name,
    career_goal: profile?.profile?.career_goal || 'AI/ML Engineer',
    overall_progress: profile?.profile?.overall_progress || 0,
    current_topic: null,
    completed_topics: [],
  };

  return (
    <div
      className="app-shell"
      style={{
        position: 'relative',
        ...(fullHeight ? { height: '100vh', maxHeight: '100vh', overflow: 'hidden' } : {}),
      }}
    >
      <AmbientGlows />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div
        className="main-content"
        style={fullHeight ? { height: '100vh', maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : undefined}
      >
        {/* Mobile header */}
        <div id="mobile-topbar" style={{
          display: 'none',
          height: 56,
          background: 'var(--clr-bg-800, #ffffff)',
          borderBottom: '1px solid var(--border-soft, #e2e8f0)',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          position: 'sticky', top: 0, zIndex: 90,
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
          <button
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--clr-bg-700, #f1f5f9)', border: '1px solid var(--border-soft, #e2e8f0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--txt-secondary, #475569)',
            }}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ink, #0f172a)' }}>
            SmartLearn AI
          </span>
        </div>

        <div style={{
          flex: 1,
          minHeight: 0,
          display: fullHeight ? 'flex' : 'block',
          flexDirection: fullHeight ? 'column' : undefined,
          overflow: fullHeight ? 'hidden' : undefined,
          height: fullHeight ? '100%' : undefined,
        }}>
          {children}
        </div>
      </div>

      {/* Voice Assistant - visible on all dashboard pages */}
      <VoiceAssistant studentContext={studentContext} />

      <style>{`
        @media (max-width: 768px) {
          #mobile-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
