import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Lazy load pages for performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LearningPathPage = lazy(() => import('./pages/LearningPathPage'));
const AssessmentPage = lazy(() => import('./pages/AssessmentPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const TutorPage = lazy(() => import('./pages/TutorPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#050510',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid rgba(108,99,255,0.2)',
        borderTopColor: '#6c63ff',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#a0a0c0', fontSize: '0.9rem' }}>Loading Smart Learning Path...</p>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

// Auth route — redirect if already logged in
function AuthRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(12,12,44,0.95)',
            color: '#f0f0ff',
            border: '1px solid rgba(108,99,255,0.3)',
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: { primary: '#00e5a0', secondary: '#050510' },
          },
          error: {
            iconTheme: { primary: '#ff4d6d', secondary: '#050510' },
          },
        }}
      />

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth */}
          <Route path="/auth" element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          } />

          {/* Protected */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/learning-path" element={
            <ProtectedRoute>
              <LearningPathPage />
            </ProtectedRoute>
          } />

          <Route path="/assessment" element={
            <ProtectedRoute>
              <AssessmentPage />
            </ProtectedRoute>
          } />

          <Route path="/quiz/:topic?" element={<Navigate to="/learning-path" replace />} />
          <Route path="/quiz" element={<Navigate to="/learning-path" replace />} />

          <Route path="/tutor" element={
            <ProtectedRoute>
              <TutorPage />
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
