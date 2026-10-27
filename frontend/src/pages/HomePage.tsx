import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BrainCircuit, Check, FileText, MessageSquareText, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { checkHealth } from '../services/api';

const capabilities = [
  { icon: FileText, number: '01', title: 'Understand your resume', text: 'Review resume strengths and get practical suggestions for your target role.', to: '/resume-analyzer', accent: 'text-sky-300 bg-sky-400/10 border-sky-300/15' },
  { icon: Target, number: '02', title: 'Measure job fit', text: 'Compare your experience with a job description and see relevant skill gaps.', to: '/job-intelligence', accent: 'text-brand-300 bg-brand-400/10 border-brand-300/15' },
  { icon: BrainCircuit, number: '03', title: 'Plan your next step', text: 'Explore AI career guidance, learning roadmaps, interview prep, and projects.', to: '/career-assistant', accent: 'text-violet-300 bg-violet-400/10 border-violet-300/15' },
];

export const HomePage: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const handleCheckBackendHealth = async () => {
    setIsLoadingHealth(true);
    setHealthError(null);
    setHealthStatus(null);
    try {
      const res = await checkHealth();
      setHealthStatus(res.status);
    } catch {
      setHealthError('Could not reach the API. Check that the backend is available and try again.');
    } finally {
      setIsLoadingHealth(false);
    }
  };

  return (
    <div className="space-y-16 pb-8 sm:space-y-20">
      <section className="relative isolate overflow-hidden rounded-panel border border-line bg-surface/70 px-6 py-12 shadow-surface sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.06] via-transparent to-transparent" />
        </div>
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-500/10 px-3.5 py-2 text-xs font-semibold tracking-wide text-brand-200">
            <Sparkles className="h-4 w-4 text-brand-300" aria-hidden="true" /> Career clarity, powered by AI
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Make your next career move with <span className="bg-gradient-to-r from-brand-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">more clarity.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            JOBFIT AI helps you understand your resume, compare your skills with real roles, and turn what you learn into a focused plan.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/dashboard" id="hero-cta-dashboard" className="button-primary min-h-12 px-5 text-sm">
              Explore your dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/about" id="hero-cta-about" className="button-secondary min-h-12 px-5 text-sm">
              How JOBFIT AI works
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-400 sm:text-sm">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Resume and job fit insights</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Personalized career guidance</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="capabilities-heading">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">A clearer way forward</p>
            <h2 id="capabilities-heading" className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Turn insight into action</h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-slate-400">Use focused tools to understand where you are and decide what to work on next.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {capabilities.map(({ icon: Icon, number, title, text, to, accent }) => (
            <Link key={number} to={to} className="surface-card-interactive group flex h-full flex-col p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-control border ${accent}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
                <span className="text-xs font-semibold tracking-widest text-slate-600">{number}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{text}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-300 group-hover:text-brand-200">Explore tool <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="surface-panel flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-control border border-violet-300/15 bg-violet-400/10 text-violet-300"><MessageSquareText className="h-5 w-5" aria-hidden="true" /></div>
            <h2 className="mt-5 text-xl font-bold text-white">Support for the steps ahead</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Get career guidance and explore roadmaps, interview preparation, and project recommendations in the Career Assistant.</p>
          </div>
          <Link to="/career-assistant" className="button-secondary w-fit">Explore Career Assistant <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="surface-card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-emerald-300/15 bg-emerald-400/10 text-emerald-300"><Activity className="h-5 w-5" aria-hidden="true" /></div>
            <div><h2 className="font-semibold text-white">API connection</h2><p className="mt-1 text-sm leading-6 text-slate-400">Check whether the JOBFIT AI backend is reachable.</p></div>
          </div>
          <button type="button" onClick={handleCheckBackendHealth} disabled={isLoadingHealth} id="btn-check-backend-health" className="button-secondary mt-5 w-full sm:w-auto">
            {isLoadingHealth ? <><Activity className="h-4 w-4 animate-pulse" aria-hidden="true" /> Checking connection…</> : 'Check connection'}
          </button>
          {healthStatus && <p role="status" id="backend-health-success" className="mt-4 flex items-center gap-2 rounded-control border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> API response: <strong>{healthStatus}</strong></p>}
          {healthError && <p role="alert" id="backend-health-error" className="mt-4 rounded-control border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{healthError}</p>}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
