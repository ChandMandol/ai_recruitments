import React, { Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';

// Lazy-loaded Top-Level Route Views for Code-Splitting
const LandingPage = React.lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = React.lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = React.lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = React.lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const CandidateDashboard = React.lazy(() =>
  import('./pages/CandidateDashboard').then((m) => ({ default: m.CandidateDashboard }))
);
const AdminDashboard = React.lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AIInterviewRoom = React.lazy(() =>
  import('./pages/interview/AIInterviewRoom').then((m) => ({ default: m.AIInterviewRoom }))
);

type ViewMode = 'landing' | 'login' | 'register' | 'forgot' | 'dashboard' | 'interview_room';

const ViewFallback: React.FC<{ message?: string }> = ({ message = 'Loading module...' }) => (
  <div className="flex-1 min-h-[360px] flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500 tracking-wide">{message}</span>
    </div>
  </div>
);

const MainContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('landing');
  const [activeRoomToken, setActiveRoomToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || (window.location.pathname.includes('/interview') ? 'room_live_gemini_7721' : null);
  });

  // Listen for browser popstate or URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room || window.location.pathname.includes('/interview')) {
        setActiveRoomToken(room || 'room_live_gemini_7721');
      } else {
        setActiveRoomToken(null);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-600">Initializing AI Recruitment Hub...</span>
        </div>
      </div>
    );
  }

  // If in an active interview room session: Render Full-Screen AI Interview Room
  if (activeRoomToken) {
    return (
      <Suspense fallback={<ViewFallback message="Connecting to AI Interview Room..." />}>
        <AIInterviewRoom
          roomToken={activeRoomToken}
          candidateName={user?.full_name || 'Candidate'}
          onExit={() => {
            setActiveRoomToken(null);
            window.history.replaceState({}, '', '/');
            setCurrentView('dashboard');
          }}
        />
      </Suspense>
    );
  }

  // If user is authenticated and on an auth view or landing, direct to dashboard
  const activeView: ViewMode =
    isAuthenticated && (currentView === 'login' || currentView === 'register' || currentView === 'forgot' || currentView === 'landing')
      ? 'dashboard'
      : !isAuthenticated && currentView === 'dashboard'
      ? 'landing'
      : currentView;

  // For Authenticated Dashboard Views: Render Full-Screen Dashboard Layout
  if (activeView === 'dashboard' && isAuthenticated) {
    return (
      <Suspense fallback={<ViewFallback message="Loading your dashboard..." />}>
        {user?.role === 'CANDIDATE' ? <CandidateDashboard /> : <AdminDashboard />}
      </Suspense>
    );
  }

  // If on Landing Page: Render full-featured Landing Page with Navbar
  if (activeView === 'landing') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        <Navbar onNavigate={setCurrentView} currentView={activeView} />
        <main className="flex-1">
          <Suspense fallback={<ViewFallback message="Loading portal overview..." />}>
            <LandingPage
              onNavigateLogin={() => setCurrentView('login')}
              onNavigateRegister={() => setCurrentView('register')}
            />
          </Suspense>
        </main>
      </div>
    );
  }

  // For Public Auth Views (Login, Register, Forgot Password)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onNavigate={setCurrentView} currentView={activeView} />

      <main className="flex-1 flex flex-col justify-center py-6">
        <Suspense fallback={<ViewFallback message="Loading authentication module..." />}>
          {activeView === 'login' && (
            <LoginPage
              onSuccess={() => setCurrentView('dashboard')}
              onNavigateRegister={() => setCurrentView('register')}
              onNavigateForgot={() => setCurrentView('forgot')}
            />
          )}

          {activeView === 'register' && (
            <RegisterPage
              onSuccess={() => setCurrentView('dashboard')}
              onNavigateLogin={() => setCurrentView('login')}
            />
          )}

          {activeView === 'forgot' && (
            <ForgotPasswordPage onNavigateLogin={() => setCurrentView('login')} />
          )}
        </Suspense>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>© 2026 AI Recruitment Hub. Powered by Google Gemini Live & WebRTC.</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
