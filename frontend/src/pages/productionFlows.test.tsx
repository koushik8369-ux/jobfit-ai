import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { JobApplicationsPage } from './JobApplicationsPage';
import { CareerAssistantPage } from './CareerAssistantPage';
import type {
  ApplicationStatus,
  CareerAssistantConversation,
  CareerAssistantMessage,
  DashboardResponse,
  JobApplication,
  JobApplicationStats,
} from '../types';

const mocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  getApplications: vi.fn(),
  getApplicationStats: vi.fn(),
  createApplication: vi.fn(),
  deleteApplication: vi.fn(),
  updateApplication: vi.fn(),
  createCareerAssistantConversation: vi.fn(),
  generateCareerActionPlan: vi.fn(),
  generateProjectRecommendations: vi.fn(),
  generateSkillRoadmap: vi.fn(),
  getCareerAssistantConversations: vi.fn(),
  getCareerAssistantMessages: vi.fn(),
  prepareForInterview: vi.fn(),
  requestResumeImprovement: vi.fn(),
  sendCareerAssistantMessage: vi.fn(),
}));

vi.mock('../services/api', () => ({ getDashboard: mocks.getDashboard }));
vi.mock('../services/applicationService', () => ({
  createApplication: mocks.createApplication,
  deleteApplication: mocks.deleteApplication,
  getApplicationStats: mocks.getApplicationStats,
  getApplications: mocks.getApplications,
  updateApplication: mocks.updateApplication,
}));
vi.mock('../services/careerAssistantService', () => ({
  CAREER_ASSISTANT_HISTORY_PAGE_SIZE: 50,
  CAREER_ASSISTANT_MAX_HISTORY_PAGE: 1000,
  createCareerAssistantConversation: mocks.createCareerAssistantConversation,
  generateCareerActionPlan: mocks.generateCareerActionPlan,
  generateProjectRecommendations: mocks.generateProjectRecommendations,
  generateSkillRoadmap: mocks.generateSkillRoadmap,
  getCareerAssistantConversations: mocks.getCareerAssistantConversations,
  getCareerAssistantMessages: mocks.getCareerAssistantMessages,
  prepareForInterview: mocks.prepareForInterview,
  requestResumeImprovement: mocks.requestResumeImprovement,
  sendCareerAssistantMessage: mocks.sendCareerAssistantMessage,
}));

const applicationStatusCounts: Record<ApplicationStatus, number> = {
  SAVED: 0,
  APPLIED: 0,
  ASSESSMENT: 0,
  INTERVIEW: 0,
  OFFER: 0,
  REJECTED: 0,
  WITHDRAWN: 0,
};

const dashboard: DashboardResponse = {
  userId: 'user-1',
  fullName: 'Sample Candidate',
  email: 'candidate@example.com',
  careerGoal: 'Software Engineer',
  education: 'Computer Science',
  profileCompletionPercentage: 80,
  skillCount: 3,
  profileStatus: 'IN_PROGRESS',
  careerOverview: {
    profileCompletionPercentage: 80,
    profileStatus: 'IN_PROGRESS',
    skillCount: 3,
    careerGoal: 'Software Engineer',
    plan: null,
  },
  applicationOverview: {
    total: 1,
    activeTotal: 1,
    byStatus: { ...applicationStatusCounts, APPLIED: 1 },
  },
  followUps: { overdueCount: 0, upcomingCount: 0, overdue: [], upcoming: [] },
  recentAnalyses: [],
  nextActions: [],
  meta: { generatedAt: '2026-01-01T00:00:00.000Z', timezone: 'UTC' },
};

const application: JobApplication = {
  id: 'application-1',
  companyName: 'Acme Systems',
  jobTitle: 'Backend Engineer',
  location: 'Remote',
  jobDescription: null,
  applicationUrl: null,
  salaryRange: null,
  applicationDate: '2026-01-01',
  status: 'APPLIED',
  followUpDate: null,
  notes: '',
  jobAnalysisId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const applicationStats: JobApplicationStats = {
  total: 1,
  byStatus: { ...applicationStatusCounts, APPLIED: 1 },
  overdueFollowUps: 0,
  followUpsDueWithinSevenDays: 0,
};

function makeConversation(index: number): CareerAssistantConversation {
  const updatedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, -index)).toISOString();
  return {
    id: `conversation-${index}`,
    title: `Conversation ${index}`,
    createdAt: updatedAt,
    updatedAt,
  };
}

function makeMessage(index: number, role: CareerAssistantMessage['role'] = index % 2 ? 'USER' : 'ASSISTANT'): CareerAssistantMessage {
  return {
    id: `message-${index}`,
    role,
    content: `Message ${index}`,
    provider: null,
    followUpSuggestions: [],
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  };
}

const conversationPage = Array.from({ length: 50 }, (_value, index) => makeConversation(index + 1));
const messagePage = Array.from({ length: 50 }, (_value, index) => makeMessage(index + 1));

beforeEach(() => {
  mocks.getDashboard.mockReset().mockResolvedValue(dashboard);
  mocks.getApplications.mockReset().mockResolvedValue({ items: [application], nextCursor: null });
  mocks.getApplicationStats.mockReset().mockResolvedValue(applicationStats);
  mocks.createApplication.mockReset();
  mocks.deleteApplication.mockReset();
  mocks.updateApplication.mockReset();
  mocks.createCareerAssistantConversation.mockReset();
  mocks.generateCareerActionPlan.mockReset();
  mocks.generateProjectRecommendations.mockReset();
  mocks.generateSkillRoadmap.mockReset();
  mocks.getCareerAssistantConversations.mockReset().mockResolvedValue(conversationPage);
  mocks.getCareerAssistantMessages.mockReset().mockResolvedValue(messagePage);
  mocks.prepareForInterview.mockReset();
  mocks.requestResumeImprovement.mockReset();
  mocks.sendCareerAssistantMessage.mockReset().mockResolvedValue({
    ...makeMessage(51, 'ASSISTANT'),
    id: 'message-new-assistant',
    content: 'Career reply',
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('production page flows', () => {
  it('shows dashboard loading feedback and renders the loaded summary', async () => {
    let resolveDashboard!: (value: DashboardResponse) => void;
    mocks.getDashboard.mockReturnValue(new Promise<DashboardResponse>((resolve) => {
      resolveDashboard = resolve;
    }));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument();

    await act(async () => { resolveDashboard(dashboard); });

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, Sample Candidate/)).toBeInTheDocument();
  });

  it('shows dashboard errors and retries the failed request', async () => {
    mocks.getDashboard.mockRejectedValueOnce({});
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your dashboard. Please try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading dashboard' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders application tracker cards after showing its loading state', async () => {
    render(<JobApplicationsPage />);

    expect(screen.getByText('Loading your applications...')).toBeInTheDocument();
    expect(await screen.findByText('Acme Systems')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(mocks.getApplications).toHaveBeenCalledWith({ limit: 50 });
  });

  it('shows application tracker errors and retries the list request', async () => {
    mocks.getApplications.mockRejectedValueOnce(new Error('private service detail'));
    render(<JobApplicationsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load applications.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Acme Systems')).toBeInTheDocument();
  });

  it('loads older conversations and messages without duplicates, then continues the selected chat', async () => {
    let resolveOlderConversations!: (value: CareerAssistantConversation[]) => void;
    mocks.getCareerAssistantConversations
      .mockResolvedValueOnce(conversationPage)
      .mockImplementationOnce(() => new Promise<CareerAssistantConversation[]>((resolve) => {
        resolveOlderConversations = resolve;
      }));
    mocks.getCareerAssistantMessages
      .mockResolvedValueOnce(messagePage)
      .mockResolvedValueOnce([{ ...makeMessage(0, 'USER'), id: 'message-older', content: 'Older message' }]);

    render(
      <MemoryRouter>
        <CareerAssistantPage />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: /Conversation 1\b/ });
    await screen.findByText('Message 1');

    fireEvent.click(screen.getByRole('button', { name: 'Load older conversations' }));
    expect(screen.getByRole('button', { name: 'Loading older conversations...' })).toBeInTheDocument();
    await act(async () => { resolveOlderConversations([makeConversation(51)]); });
    expect(await screen.findByRole('button', { name: /Conversation 51/ })).toBeInTheDocument();
    expect(mocks.getCareerAssistantConversations).toHaveBeenLastCalledWith({ page: 2, limit: 50 });

    fireEvent.click(screen.getByRole('button', { name: 'Load older messages' }));
    expect(await screen.findByText('Older message')).toBeInTheDocument();
    expect(mocks.getCareerAssistantMessages).toHaveBeenLastCalledWith('conversation-1', { page: 2, limit: 50 });
    const olderMessage = screen.getByText('Older message');
    const newestMessage = screen.getByText('Message 1');
    expect(olderMessage.compareDocumentPosition(newestMessage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    vi.stubGlobal('crypto', { randomUUID: () => 'new-user-message' });
    fireEvent.change(screen.getByLabelText('Ask a career question'), { target: { value: 'New question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Career reply')).toBeInTheDocument();
    expect(screen.getByText('New question')).toBeInTheDocument();
    expect(mocks.sendCareerAssistantMessage).toHaveBeenCalledWith('conversation-1', { question: 'New question' });
  });

  it('shows an older-message error and retries the same page', async () => {
    mocks.getCareerAssistantMessages
      .mockResolvedValueOnce(messagePage)
      .mockRejectedValueOnce(new Error('private service detail'))
      .mockResolvedValueOnce([{ ...makeMessage(0, 'USER'), id: 'message-retry', content: 'Recovered older message' }]);

    render(
      <MemoryRouter>
        <CareerAssistantPage />
      </MemoryRouter>,
    );
    await screen.findByText('Message 1');

    fireEvent.click(screen.getByRole('button', { name: 'Load older messages' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load older messages.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading older messages' }));

    expect(await screen.findByText('Recovered older message')).toBeInTheDocument();
    expect(mocks.getCareerAssistantMessages).toHaveBeenLastCalledWith('conversation-1', { page: 2, limit: 50 });
  });

  it('shows an older-conversation error and retries the same page', async () => {
    mocks.getCareerAssistantConversations
      .mockResolvedValueOnce(conversationPage)
      .mockRejectedValueOnce(new Error('private service detail'))
      .mockResolvedValueOnce([makeConversation(51)]);

    render(
      <MemoryRouter>
        <CareerAssistantPage />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: /Conversation 1\b/ });

    fireEvent.click(screen.getByRole('button', { name: 'Load older conversations' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load older conversations.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading older conversations' }));

    expect(await screen.findByRole('button', { name: /Conversation 51/ })).toBeInTheDocument();
    expect(mocks.getCareerAssistantConversations).toHaveBeenLastCalledWith({ page: 2, limit: 50 });
  });
});
