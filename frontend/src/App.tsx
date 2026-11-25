import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LazyRouteErrorBoundary } from './components/common/LazyRouteErrorBoundary';

const HomePage = lazy(
  () => import('./pages/HomePage').then(({ HomePage }) => ({ default: HomePage })),
);
const DashboardPage = lazy(
  () => import('./pages/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })),
);
const AboutPage = lazy(
  () => import('./pages/AboutPage').then(({ AboutPage }) => ({ default: AboutPage })),
);
const LoginPage = lazy(
  () => import('./pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })),
);
const RegisterPage = lazy(
  () => import('./pages/RegisterPage').then(({ RegisterPage }) => ({ default: RegisterPage })),
);
const NotFoundPage = lazy(
  () => import('./pages/NotFoundPage').then(({ NotFoundPage }) => ({ default: NotFoundPage })),
);
const ProfilePage = lazy(
  () => import('./pages/ProfilePage').then(({ ProfilePage }) => ({ default: ProfilePage })),
);
const ResumeAnalyzerPage = lazy(
  () => import('./pages/ResumeAnalyzerPage').then(({ ResumeAnalyzerPage }) => ({ default: ResumeAnalyzerPage })),
);
const JobIntelligencePage = lazy(
  () => import('./pages/JobIntelligencePage').then(({ JobIntelligencePage }) => ({ default: JobIntelligencePage })),
);
const CareerAssistantPage = lazy(
  () => import('./pages/CareerAssistantPage').then(({ CareerAssistantPage }) => ({ default: CareerAssistantPage })),
);
const CareerPlanPage = lazy(
  () => import('./pages/CareerPlanPage').then(({ CareerPlanPage }) => ({ default: CareerPlanPage })),
);
const InterviewPreparationPage = lazy(
  () => import('./pages/InterviewPreparationPage').then(({ InterviewPreparationPage }) => ({ default: InterviewPreparationPage })),
);
const ProjectRecommendationsPage = lazy(
  () => import('./pages/ProjectRecommendationsPage').then(({ ProjectRecommendationsPage }) => ({ default: ProjectRecommendationsPage })),
);
const JobApplicationsPage = lazy(
  () => import('./pages/JobApplicationsPage').then(({ JobApplicationsPage }) => ({ default: JobApplicationsPage })),
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LazyRouteErrorBoundary>
          <Suspense fallback={<div role="status">Loading JOBFIT AI…</div>}>
            <Routes>
              {/* Standalone auth pages — full-screen, no AppLayout chrome */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Main app shell */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="resume-analyzer"
                  element={
                    <ProtectedRoute>
                      <ResumeAnalyzerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="job-intelligence"
                  element={
                    <ProtectedRoute>
                      <JobIntelligencePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="career-assistant"
                  element={<ProtectedRoute><CareerAssistantPage /></ProtectedRoute>}
                />
                <Route
                  path="career-plan"
                  element={<ProtectedRoute><CareerPlanPage /></ProtectedRoute>}
                />
                <Route
                  path="interview-preparation"
                  element={<ProtectedRoute><InterviewPreparationPage /></ProtectedRoute>}
                />
                <Route
                  path="project-recommendations"
                  element={<ProtectedRoute><ProjectRecommendationsPage /></ProtectedRoute>}
                />
                <Route
                  path="applications"
                  element={<ProtectedRoute><JobApplicationsPage /></ProtectedRoute>}
                />
                <Route path="about" element={<AboutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </LazyRouteErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
