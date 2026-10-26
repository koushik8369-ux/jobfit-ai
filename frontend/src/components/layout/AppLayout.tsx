import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Home, LayoutDashboard, Info, LogIn, LogOut, UserCircle2, FileText, Briefcase, Bot, CalendarCheck, MessageSquareText, FolderKanban, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/resume-analyzer', label: 'Resume Analyzer', icon: FileText },
    { to: '/job-intelligence', label: 'Job Intelligence', icon: Briefcase },
    { to: '/career-assistant', label: 'Career Assistant', icon: Bot },
    { to: '/career-plan', label: 'Career Plan', icon: CalendarCheck },
    { to: '/interview-preparation', label: 'Interview Prep', icon: MessageSquareText },
    { to: '/project-recommendations', label: 'Projects', icon: FolderKanban },
    { to: '/profile', label: 'Profile', icon: UserCircle2 },
    { to: '/about', label: 'About', icon: Info },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500/30 selection:text-brand-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 flex items-center justify-between gap-3">
          {/* Brand / Logo */}
          <NavLink
            to="/"
            className="flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.02] shrink-0"
            id="brand-logo"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/25 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse-subtle" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent">
                JOBFIT AI
              </span>
              <span className="hidden md:block text-[10px] font-medium tracking-wider text-slate-400 uppercase -mt-1">
                Career Intelligence
              </span>
            </div>
          </NavLink>

          {/* Auth controls */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                {/* User badge */}
                <div
                  id="nav-user-badge"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-sm text-slate-300"
                >
                  <UserCircle2 className="w-4 h-4 text-brand-400" />
                  <span className="max-w-[120px] truncate font-medium">{user.fullName}</span>
                </div>
                {/* Logout */}
                <button
                  id="nav-logout-btn"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                id="nav-login-btn"
                className="flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-sm font-semibold
                           bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500
                           text-white shadow-md shadow-brand-500/20 transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </NavLink>
            )}
            <button
              type="button"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/70 text-slate-300 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
              aria-controls="main-nav"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <nav
          className={`${isMenuOpen ? 'block' : 'hidden'} lg:block border-t border-slate-800/70`}
          id="main-nav"
          aria-label="Primary navigation"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:flex lg:flex-wrap lg:justify-center gap-2">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                id={`nav-link-${label.toLowerCase()}`}
                end={to === '/'}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-center lg:justify-start gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                    isActive
                      ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in" id="main-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} JOBFIT AI — AI-Powered Job Fit &amp; Career Readiness Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
