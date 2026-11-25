import User from '../models/User.js';
import CareerPlan from '../models/CareerPlan.js';
import JobApplication, { APPLICATION_STATUSES } from '../models/JobApplication.js';
import JobAnalysis from '../models/JobAnalysis.js';

const TOTAL_COMPLETION_FIELDS = 9;
const ACTIVE_APPLICATION_STATUSES = Object.freeze(['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW']);
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function createNotFoundError() {
  const error = new Error('Authenticated user was not found');
  error.status = 404;
  return error;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function utcStartOfToday(now) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function planResponse(plan) {
  if (!plan) return null;

  const items = Array.isArray(plan.items) ? [...plan.items] : [];
  const completedItems = items.filter((item) => (
    item.completed === true || item.status === 'COMPLETED'
  )).length;
  const inProgressItems = items.filter((item) => (
    item.status === 'IN_PROGRESS' && item.completed !== true
  )).length;
  const remainingItems = items.length - completedItems;
  const currentStage = items
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .find((item) => item.completed !== true && item.status !== 'COMPLETED')
    ?.category ?? null;

  return {
    id: String(plan._id ?? plan.id),
    status: plan.status,
    careerGoal: plan.careerGoal ?? null,
    progress: {
      totalItems: items.length,
      completedItems,
      inProgressItems,
      remainingItems,
      completionPercent: items.length === 0
        ? 0
        : Math.round((completedItems / items.length) * 100),
      currentStage,
    },
    updatedAt: plan.updatedAt ?? null,
  };
}

function followUpResponse(application) {
  const value = application && typeof application.toObject === 'function'
    ? application.toObject()
    : application;
  return {
    id: String(value._id ?? value.id),
    companyName: value.companyName,
    jobTitle: value.jobTitle,
    status: value.status,
    followUpDate: value.followUpDate,
    applicationUrl: value.applicationUrl ?? null,
  };
}

function analysisResponse(analysis) {
  const value = typeof analysis.toObject === 'function'
    ? analysis.toObject()
    : analysis;
  return {
    id: String(value._id ?? value.id),
    jobTitle: value.jobTitle,
    companyName: value.companyName ?? null,
    overallMatchScore: value.overallMatchScore,
    createdAt: value.createdAt ?? null,
  };
}

function createNextActions({
  followUp,
  profileCompletionPercentage,
  plan,
  applicationTotal,
  recentAnalysisCount,
}) {
  const actions = [];
  if (followUp.overdueCount > 0) {
    actions.push({
      id: 'address-overdue-follow-ups',
      priority: 'HIGH',
      title: 'Address overdue follow-ups',
      description: `${followUp.overdueCount} application follow-up${followUp.overdueCount === 1 ? '' : 's'} need attention.`,
      actionLabel: 'Review follow-ups',
      path: '/applications',
    });
  }
  if (profileCompletionPercentage < 100) {
    actions.push({
      id: 'complete-profile',
      priority: 'MEDIUM',
      title: 'Complete your profile',
      description: 'Add missing profile details to strengthen your career recommendations.',
      actionLabel: 'Update profile',
      path: '/profile',
    });
  }
  if (plan && plan.status === 'ACTIVE' && plan.progress.remainingItems > 0) {
    actions.push({
      id: 'continue-career-plan',
      priority: 'MEDIUM',
      title: 'Continue your career plan',
      description: `${plan.progress.remainingItems} action${plan.progress.remainingItems === 1 ? '' : 's'} remain in your current plan.`,
      actionLabel: 'View career plan',
      path: '/career-plan',
    });
  } else if (!plan) {
    actions.push({
      id: 'create-career-plan',
      priority: 'MEDIUM',
      title: 'Create a career plan',
      description: 'Turn your profile and career evidence into trackable next steps.',
      actionLabel: 'Create plan',
      path: '/career-plan',
    });
  }
  if (applicationTotal === 0) {
    actions.push({
      id: 'add-first-application',
      priority: 'LOW',
      title: 'Track your first application',
      description: 'Start organizing an opportunity and its next follow-up.',
      actionLabel: 'Add application',
      path: '/applications',
    });
  }
  if (recentAnalysisCount === 0) {
    actions.push({
      id: 'analyze-first-job',
      priority: 'LOW',
      title: 'Analyze a job description',
      description: 'Compare a target role against your saved skills and experience.',
      actionLabel: 'Analyze job',
      path: '/job-intelligence',
    });
  }
  return actions;
}

export function createDashboardService({
  userModel = User,
  careerPlanModel = CareerPlan,
  applicationModel = JobApplication,
  jobAnalysisModel = JobAnalysis,
  clock = () => new Date(),
} = {}) {
  return {
    async getDashboard(authenticatedUser) {
      const user = await userModel.findById(authenticatedUser.id);
      if (!user) {
        throw createNotFoundError();
      }

      const profile = user.profile;
      const completedFields = [
        hasText(user.fullName),
        hasText(user.email),
        hasText(profile?.education),
        hasText(profile?.college),
        profile?.graduationYear != null,
        hasText(profile?.careerGoal),
        Array.isArray(profile?.skills) && profile.skills.length > 0,
        hasText(profile?.bio),
        hasText(profile?.location),
      ].filter(Boolean).length;
      const profileCompletionPercentage = profile
        ? Math.floor(completedFields * 100 / TOTAL_COMPLETION_FIELDS)
        : 0;
      const profileStatus = profileCompletionPercentage === 100
        ? 'COMPLETE'
        : profileCompletionPercentage === 0 ? 'NOT_STARTED' : 'IN_PROGRESS';

      const now = clock();
      const today = utcStartOfToday(now);
      const sevenDaysLater = new Date(today.getTime() + (7 * DAY_IN_MILLISECONDS));

      const planQuery = careerPlanModel.findOne({
        user: authenticatedUser.id,
        status: { $in: ['ACTIVE', 'COMPLETED'] },
      }).sort({ updatedAt: -1 });

      const [
        plan,
        applicationStatusResults,
        applicationFollowUpCounts,
        overdueApplications,
        upcomingApplications,
        recentAnalyses,
      ] = await Promise.all([
        typeof planQuery.lean === 'function' ? planQuery.lean() : planQuery,
        applicationModel.aggregate([
          { $match: { userId: authenticatedUser.id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        applicationModel.aggregate([
          { $match: { userId: authenticatedUser.id } },
          {
            $group: {
              _id: null,
              overdueCount: {
                $sum: {
                  $cond: [{
                    $and: [
                      { $in: ['$status', ACTIVE_APPLICATION_STATUSES] },
                      { $ne: [{ $ifNull: ['$followUpDate', null] }, null] },
                      { $lt: ['$followUpDate', today] },
                    ],
                  }, 1, 0],
                },
              },
              upcomingCount: {
                $sum: {
                  $cond: [{
                    $and: [
                      { $in: ['$status', ACTIVE_APPLICATION_STATUSES] },
                      { $ne: [{ $ifNull: ['$followUpDate', null] }, null] },
                      { $gte: ['$followUpDate', today] },
                      { $lt: ['$followUpDate', sevenDaysLater] },
                    ],
                  }, 1, 0],
                },
              },
            },
          },
        ]),
        applicationModel.find({
          userId: authenticatedUser.id,
          status: { $in: ACTIVE_APPLICATION_STATUSES },
          followUpDate: { $lt: today },
        }).sort({ followUpDate: 1, _id: 1 }).limit(5).lean(),
        applicationModel.find({
          userId: authenticatedUser.id,
          status: { $in: ACTIVE_APPLICATION_STATUSES },
          followUpDate: { $gte: today, $lt: sevenDaysLater },
        }).sort({ followUpDate: 1, _id: 1 }).limit(5).lean(),
        jobAnalysisModel.find({ user: authenticatedUser.id })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
      let applicationTotal = 0;
      for (const result of applicationStatusResults) {
        if (Object.hasOwn(byStatus, result._id)) {
          byStatus[result._id] = result.count;
          applicationTotal += result.count;
        }
      }
      const activeTotal = ACTIVE_APPLICATION_STATUSES
        .reduce((total, status) => total + byStatus[status], 0);

      const planSummary = planResponse(plan);
      const overdue = overdueApplications.map(followUpResponse);
      const upcoming = upcomingApplications.map(followUpResponse);
      const analyses = recentAnalyses.map(analysisResponse);
      const followUpCounts = applicationFollowUpCounts[0] ?? {
        overdueCount: overdue.length,
        upcomingCount: upcoming.length,
      };
      const followUp = {
        overdueCount: followUpCounts.overdueCount,
        upcomingCount: followUpCounts.upcomingCount,
        overdue,
        upcoming,
      };

      return {
        userId: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        careerGoal: profile?.careerGoal ?? null,
        education: profile?.education ?? null,
        profileCompletionPercentage,
        skillCount: profile?.skills?.length ?? 0,
        profileStatus,
        careerOverview: {
          profileCompletionPercentage,
          profileStatus,
          skillCount: profile?.skills?.length ?? 0,
          careerGoal: profile?.careerGoal ?? null,
          plan: planSummary,
        },
        applicationOverview: {
          total: applicationTotal,
          activeTotal,
          byStatus,
        },
        followUps: followUp,
        recentAnalyses: analyses,
        nextActions: createNextActions({
          followUp,
          profileCompletionPercentage,
          plan: planSummary,
          applicationTotal,
          recentAnalysisCount: analyses.length,
        }),
        meta: {
          generatedAt: now.toISOString(),
          timezone: 'UTC',
        },
      };
    },
  };
}