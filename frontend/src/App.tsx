import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { CandidateDashboard } from './pages/CandidateDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AIInterviewRoom } from './pages/interview/AIInterviewRoom';

type ViewMode = 'login' | 'register' | 'forgot' | 'dashboard' | 'interview_room';

const MainContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('login');
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
      <AIInterviewRoom
        roomToken={activeRoomToken}
        candidateName={user?.full_name || 'Candidate'}
        onExit={() => {
          setActiveRoomToken(null);
          window.history.replaceState({}, '', '/');
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // If user is authenticated and on an auth view, direct to dashboard
  const activeView: ViewMode =
    isAuthenticated && (currentView === 'login' || currentView === 'register' || currentView === 'forgot')
      ? 'dashboard'
      : !isAuthenticated && currentView === 'dashboard'
      ? 'login'
      : currentView;

  // For Authenticated Dashboard Views: Render Full-Screen Dashboard Layout
  if (activeView === 'dashboard' && isAuthenticated) {
    return user?.role === 'CANDIDATE' ? <CandidateDashboard /> : <AdminDashboard />;
  }

  // For Public Auth Views (Login, Register, Forgot Password)
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onNavigate={setCurrentView} currentView={activeView} />

      <main className="flex-1 flex flex-col justify-center py-6">
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
