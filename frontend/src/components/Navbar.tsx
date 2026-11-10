import React from 'react';
import { Bot, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onNavigate: (view: 'login' | 'register' | 'forgot' | 'dashboard') => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentView }) => {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onNavigate('login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'login')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-lg bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              AI Recruitment Hub
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              v1.0
            </span>
          </div>
        </div>

        {/* User / Action Menu */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Role Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-xs bg-slate-50 border-slate-200 text-slate-700">
                {user.role === 'CANDIDATE' ? (
                  <>
                    <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Candidate</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Admin</span>
                  </>
                )}
              </div>

              {/* User Name */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-800 leading-tight">
                  {user.full_name}
                </span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  currentView === 'login'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

