import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Globe2 } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

function AuthForm({ mode, onToggle, prefillEmail }) {
  const navigate = useNavigate();
  const { login, register, isLoading, error } = useAuthStore();

  const [form, setForm] = useState({ fullName: '', email: prefillEmail || '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [registeredNotice, setRegisteredNotice] = useState(false);

  useEffect(() => {
    if (prefillEmail) {
      setForm((f) => ({ ...f, email: prefillEmail }));
    }
  }, [prefillEmail]);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (forgotMode) {
      toast.success('If this email is registered, you will receive reset instructions.');
      setForgotMode(false);
      return;
    }

    if (mode === 'login') {
      const result = await login(form.email, form.password);
      if (result.success) {
        toast.success('Welcome back! 👋');
        setTimeout(() => {
          navigate('/dashboard');
        }, 300);
      } else {
        toast.error(result.error || 'Login failed. Please check your credentials.');
      }
    } else {
      if (!form.fullName.trim()) {
        toast.error('Please enter your full name');
        return;
      }
      const result = await register(form.fullName, form.email, form.password);
      if (result.success) {
        setRegisteredNotice(true);
        toast.success('Registration successful! Please sign in with your credentials.');
        // Do NOT directly log in. Switch to login screen!
        onToggle('login', form.email);
        setForm((f) => ({ ...f, password: '' }));
      } else {
        toast.error(result.error || 'Registration failed');
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.form
        key={forgotMode ? 'forgot' : mode}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.25 }}
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {registeredNotice && mode === 'login' && (
          <div style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '0.84rem',
            lineHeight: 1.5,
          }}>
            ✅ <strong>Account created!</strong> Please sign in below to continue.
          </div>
        )}

        {forgotMode ? (
          <>
            <div style={{ marginBottom: 4 }}>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#56657F', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 2 }}>Reset password</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted, #56657F)', marginBottom: 8 }}>Enter your email to receive reset instructions.</p>
            <div className="input-group">
              <label className="input-label" style={{ color: 'var(--ink, #0B1220)', fontWeight: 600 }}>Email address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" color="var(--muted, #56657F)" />
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                  style={{ background: 'transparent', borderColor: 'var(--bdr, #CBD5E1)', color: 'var(--ink, #0B1220)' }}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}>
              Send reset link
            </button>
          </>
        ) : (
          <>
            {mode === 'register' && (
              <div className="input-group">
                <label className="input-label" style={{ color: 'var(--ink, #0B1220)', fontWeight: 600 }}>Full name</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" color="var(--muted, #56657F)" />
                  <input
                    className="input"
                    type="text"
                    placeholder="Jane Doe"
                    value={form.fullName}
                    onChange={(e) => update('fullName', e.target.value)}
                    required
                    style={{ background: 'transparent', borderColor: 'var(--bdr, #CBD5E1)', color: 'var(--ink, #0B1220)' }}
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label" style={{ color: 'var(--ink, #0B1220)', fontWeight: 600 }}>Email address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" color="var(--muted, #56657F)" />
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                  style={{ background: 'transparent', borderColor: 'var(--bdr, #CBD5E1)', color: 'var(--ink, #0B1220)' }}
                />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" style={{ color: 'var(--ink, #0B1220)', fontWeight: 600 }}>Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    style={{ fontSize: '0.78rem', color: '#2F5BFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" color="var(--muted, #56657F)" />
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                  minLength={6}
                  style={{ paddingRight: 44, background: 'transparent', borderColor: 'var(--bdr, #CBD5E1)', color: 'var(--ink, #0B1220)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted, #56657F)',
                  }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ marginTop: 4, borderRadius: 10, fontWeight: 600, padding: '12px' }}
            >
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'login' ? 'Sign in' : 'Create account'
              )}
            </button>

            <div className="divider-with-text" style={{ margin: '4px 0', color: 'var(--muted, #56657F)' }}>or continue with</div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => toast('Google OAuth requires Supabase configuration. Use email/password for now.', { icon: 'ℹ️' })}
              style={{ background: 'transparent', borderColor: 'var(--bdr, #CBD5E1)', color: 'var(--ink, #0B1220)', borderRadius: 10 }}
            >
              <Globe2 size={16} />
              Continue with Google
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#56657F', marginTop: 4 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => onToggle(mode === 'login' ? 'register' : 'login')}
                style={{ color: '#2F5BFF', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </motion.form>
    </AnimatePresence>
  );
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [prefillEmail, setPrefillEmail] = useState('');

  const handleToggle = (nextMode, emailToKeep) => {
    setMode(nextMode);
    if (emailToKeep) {
      setPrefillEmail(emailToKeep);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F4F7FC',
      display: 'flex',
      alignItems: 'stretch',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Soft background accents */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -80,
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(47,91,255,0.07) 0%, rgba(244,247,252,0) 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -100,
        left: -80,
        width: 420,
        height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(242,163,27,0.06) 0%, rgba(244,247,252,0) 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left: Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        position: 'relative',
        zIndex: 1,
      }}
        className="auth-left"
      >
        <div style={{ maxWidth: 460 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: '#2F5BFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(47,91,255,0.25)',
            }}>
              <Zap size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#12203A', fontFamily: 'var(--font-heading)' }}>Smart Learning Path</div>
              <div style={{ fontSize: '0.72rem', color: '#56657F', fontWeight: 600, letterSpacing: '0.04em' }}>Recommendation System</div>
            </div>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#12203A',
            fontFamily: 'var(--font-heading)',
            lineHeight: 1.18,
            marginBottom: 16,
          }}>
            {mode === 'login' ? 'Welcome back' : 'Start your learning trail'}
          </h1>
          <p style={{ fontSize: '1rem', color: '#56657F', lineHeight: 1.65, marginBottom: 36 }}>
            {mode === 'login'
              ? 'Sign in to access your dashboard, 3D progress trail, and personalized next recommendations.'
              : 'Create an account to begin your personalized learning path with intelligent skill tracking.'}
          </p>

          {/* Feature highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Interactive 3D learning trail & upward progress spiral',
              'Personalized next lesson recommendations with AI reasoning',
              'Topic-by-topic quizzes and skill gap analysis',
              'Real-time voice & conversational learning support',
            ].map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                fontSize: '0.9rem', color: '#12203A', fontWeight: 500,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#EEF2FF', color: '#2F5BFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                }}>
                  ✓
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Auth form */}
      <div style={{
        width: 480,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: 'var(--paper, #FFFFFF)',
        borderLeft: '1px solid var(--bdr, #E2E8F0)',
        position: 'relative',
        zIndex: 1,
      }}
        className="auth-right"
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--ink, #0B1220)', fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted, #56657F)' }}>
              {mode === 'login' ? 'Enter your credentials to access your dashboard.' : 'Enter your details to create your student profile.'}
            </p>
          </div>

          <div style={{ padding: '8px 0' }}>
            <AuthForm
              mode={mode}
              prefillEmail={prefillEmail}
              onToggle={handleToggle}
            />
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted, #56657F)', marginTop: 20, lineHeight: 1.6 }}>
            Protected by secure JWT session authentication.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-right { width: 100% !important; border-left: none !important; background: transparent !important; }
        }
      `}</style>
    </div>
  );
}
