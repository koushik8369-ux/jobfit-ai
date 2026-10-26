import api from './api';
import type {
  CareerAssistantConversation,
  CareerAssistantMessage,
  CareerAssistantMessageRequest,
  CareerActionPlanResult,
  CareerRoadmapResult,
  CareerPlan,
  CareerPlanItemUpdateRequest,
  InterviewAnswerFeedback,
  InterviewAnswerFeedbackRequest,
  InterviewPreparationResult,
  ProjectRecommendationResult,
  ProjectRecommendationPreferences,
  ResumeImprovementResult,
} from '../types';

const CAREER_AI_REQUEST_TIMEOUT_MS = 35_000;

export const createCareerAssistantConversation = async (): Promise<CareerAssistantConversation> => {
  const response = await api.post<CareerAssistantConversation>('/career-assistant/conversations');
  return response.data;
};

export const getCareerAssistantConversations = async (): Promise<CareerAssistantConversation[]> => {
  const response = await api.get<CareerAssistantConversation[]>('/career-assistant/conversations');
  return response.data;
};

export const getCareerAssistantMessages = async (conversationId: string): Promise<CareerAssistantMessage[]> => {
  const response = await api.get<CareerAssistantMessage[]>(`/career-assistant/conversations/${conversationId}/messages`);
  return response.data;
};

export const sendCareerAssistantMessage = async (
  conversationId: string,
  request: CareerAssistantMessageRequest,
): Promise<CareerAssistantMessage> => {
  const response = await api.post<CareerAssistantMessage>(
    `/career-assistant/conversations/${conversationId}/messages`,
    request,
    { timeout: CAREER_AI_REQUEST_TIMEOUT_MS },
  );
  return response.data;
};

export const requestResumeImprovement = async (): Promise<ResumeImprovementResult> => {
  const response = await api.post<ResumeImprovementResult>(
    '/career-assistant/resume-improvement',
    undefined,
    { timeout: CAREER_AI_REQUEST_TIMEOUT_MS },
  );
  return response.data;
};

export const generateSkillRoadmap = async (): Promise<CareerRoadmapResult> => {
  const response = await api.post<CareerRoadmapResult>(
    '/career-assistant/roadmap',
    undefined,
    { timeout: CAREER_AI_REQUEST_TIMEOUT_MS },
  );
  return response.data;
};

export const generateProjectRecommendations = async (
  preferences: ProjectRecommendationPreferences = {},
): Promise<ProjectRecommendationResult> => {
  const response = await api.post<ProjectRecommendationResult>(
    '/career-assistant/projects',
    preferences,
    { timeout: CAREER_AI_REQUEST_TIMEOUT_MS },
  );
  return response.data;
};

export const prepareForInterview = async (): Promise<InterviewPreparationResult> => {
  const response = await api.post<InterviewPreparationResult>(
    '/career-assistant/interview-preparation',
    undefined,
    { timeout: CAREER_AI_REQUEST_TIMEOUT_MS },
  );
  return response.data;
};

export const getInterviewAnswerFeedback = async (
  request: InterviewAnswerFeedbackRequest,
): Promise<InterviewAnswerFeedback> => {
  const response = await api.post<InterviewAnswerFeedback>(
    '/career-assistant/interview-preparation/feedback',
    request,
    { timeout: CAREER_AI_REQUEST_TIMEOUT_MS },
  );
  return response.data;
};

export const generateCareerActionPlan = async (): Promise<CareerActionPlanResult> => {
  const response = await api.post<CareerActionPlanResult>(
    '/career-assistant/action-plan',
    undefined,
    { timeout: CAREER_AI_REQUEST_TIMEOUT_MS },
  );
  return response.data;
};

export const generateCareerPlan = async (): Promise<CareerPlan> => {
  const response = await api.post<CareerPlan>(
    '/career-plans',
    undefined,
    { timeout: CAREER_AI_REQUEST_TIMEOUT_MS },
  );
  return response.data;
};

export const getCurrentCareerPlan = async (): Promise<CareerPlan> => {
  const response = await api.get<CareerPlan>('/career-plans/current');
  return response.data;
};

export const getCareerPlan = async (planId: string): Promise<CareerPlan> => {
  const response = await api.get<CareerPlan>(`/career-plans/${planId}`);
  return response.data;
};

export const updateCareerPlanItem = async (
  planId: string,
  itemId: string,
  request: CareerPlanItemUpdateRequest,
): Promise<CareerPlan> => {
  const response = await api.patch<CareerPlan>(`/career-plans/${planId}/items/${itemId}`, request);
  return response.data;
};