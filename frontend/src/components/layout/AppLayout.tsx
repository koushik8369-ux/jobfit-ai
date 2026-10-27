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
    <div className="flex min-h-screen flex-col bg-canvas text-slate-100">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.25rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Brand / Logo */}
          <NavLink
            to="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-control transition-transform duration-200 hover:scale-[1.02]"
            id="brand-logo"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-gradient-to-tr from-brand-600 via-indigo-500 to-violet-500 shadow-brand-soft ring-1 ring-white/15">
              <Sparkles className="w-5 h-5 text-white animate-pulse-subtle" />
            </div>
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-white to-brand-200 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                JOBFIT AI
              </span>
              <span className="-mt-1 hidden text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 md:block">
                Career Intelligence
              </span>
            </div>
          </NavLink>

          {/* Auth controls */}
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <>
                {/* User badge */}
                <div
                  id="nav-user-badge"
                  className="hidden items-center gap-2 rounded-control border border-line bg-surface/80 px-3 py-2 text-sm text-slate-300 sm:flex"
                >
                  <UserCircle2 className="w-4 h-4 text-brand-400" />
                  <span className="max-w-[120px] truncate font-medium">{user.fullName}</span>
                </div>
                {/* Logout */}
                <button
                  id="nav-logout-btn"
                  onClick={handleLogout}
                  className="button-quiet text-slate-400 hover:bg-rose-500/10 hover:text-rose-200"
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
                className="button-primary"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </NavLink>
            )}
            <button
              type="button"
              className="button-quiet h-10 w-10 p-0 lg:hidden"
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
          className={`${isMenuOpen ? 'block' : 'hidden'} border-t border-line bg-slate-950/70 lg:block`}
          id="main-nav"
          aria-label="Primary navigation"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-1.5 px-4 py-3 sm:grid-cols-3 sm:gap-2 sm:px-6 md:grid-cols-5 lg:px-8">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                id={`nav-link-${label.toLowerCase()}`}
                end={to === '/'}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `app-nav-link ${isActive ? 'app-nav-link-active' : ''}`
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 animate-fade-in sm:px-6 lg:px-8" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="border-t border-line bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} JOBFIT AI — AI-Powered Job Fit &amp; Career Readiness Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
