import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import { createDashboardService } from '../src/services/dashboardService.js';
import { extractAuthentication, generateToken } from '../src/utils/jwt.js';

const testEnvironment = {
  JWT_SECRET: randomBytes(32).toString('hex'),
  JWT_EXPIRATION: '3600000',
};

function createUser({ id, email, fullName, profile }) {
  const user = {
    _id: id,
    email,
    fullName,
    role: 'USER',
    passwordHash: randomBytes(32).toString('hex'),
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    profile: profile ? structuredClone(profile) : undefined,
    async save() {
      return user;
    },
  };
  return user;
}

function createUserModel(users) {
  return {
    async findOne({ email }) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async findById(id) {
      return users.get(id) ?? null;
    },
  };
}

function makeProfile(overrides = {}) {
  return {
    phone: '+1 555 0100',
    education: 'Computer Science',
    college: 'Example College',
    graduationYear: 2027,
    careerGoal: 'Backend Engineer',
    bio: 'Building secure systems',
    location: 'Seattle',
    skills: ['Java', 'SQL'],
    createdAt: new Date('2025-02-01T00:00:00.000Z'),
    updatedAt: new Date('2025-02-02T00:00:00.000Z'),
    ...overrides,
  };
}

function assertSafeError(response, expectedStatus) {
  assert.equal(response.status, expectedStatus);
  assert.match(response.headers['content-type'], /application\/json/);
  assert.equal(response.body.status, expectedStatus);
  assert.equal(typeof response.body.message, 'string');
  assert.ok(response.body.timestamp);
  assert.equal('stack' in response.body, false);
}

describe('embedded profile model', () => {
  it('stores profile data on User without serializing auth fields or a separate profile ID', () => {
    const user = new User({
      fullName: 'Owner User',
      email: 'owner@example.com',
      passwordHash: randomBytes(32).toString('hex'),
      role: 'USER',
      profile: makeProfile(),
    });
    const response = user.toJSON();

    assert.equal(User.modelName, 'User');
    assert.equal(response.profile.education, 'Computer Science');
    assert.deepEqual(response.profile.skills, ['Java', 'SQL']);
    assert.equal('_id' in response.profile, false);
    assert.equal('passwordHash' in response, false);
    assert.equal('password' in response, false);
  });
});

describe('profile and dashboard APIs', () => {
  let app;
  let users;
  let owner;
  let otherUser;
  let ownerToken;
  let otherToken;

  beforeEach(() => {
    owner = createUser({
      id: 'profile-user-1',
      email: 'owner@example.com',
      fullName: 'Owner User',
      profile: makeProfile(),
    });
    otherUser = createUser({
      id: 'profile-user-2',
      email: 'other@example.com',
      fullName: 'Other User',
      profile: makeProfile({
        education: 'Mathematics',
        college: 'Other College',
        careerGoal: 'Data Analyst',
        skills: ['Python'],
      }),
    });
    users = new Map([[owner._id, owner], [otherUser._id, otherUser]]);
    const userModel = createUserModel(users);
    app = createApp({
      authDependencies: {
        userModel,
        authenticateToken: (token) => extractAuthentication(token, testEnvironment),
      },
      dashboardDependencies: {
        userModel,
        authenticateToken: (token) => extractAuthentication(token, testEnvironment),
        careerPlanModel: {
          findOne() {
            const query = {
              sort() { return query; },
              lean() { return Promise.resolve(null); },
              then(resolve) { return Promise.resolve(null).then(resolve); },
            };
            return query;
          },
        },
        applicationModel: {
          aggregate() { return Promise.resolve([]); },
          find() {
            const query = {
              sort() { return query; },
              limit() { return query; },
              lean() { return Promise.resolve([]); },
            };
            return query;
          },
        },
        jobAnalysisModel: {
          find() {
            const query = {
              sort() { return query; },
              limit() { return query; },
              lean() { return Promise.resolve([]); },
            };
            return query;
          },
        },
      },
    });
    ownerToken = generateToken(owner.email, owner.role, testEnvironment);
    otherToken = generateToken(otherUser.email, otherUser.role, testEnvironment);
  });

  it('GET /api/profile returns the Spring-compatible response shape for the JWT user', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body).sort(), [
      'bio', 'careerGoal', 'college', 'createdAt', 'education', 'email', 'fullName',
      'graduationYear', 'location', 'phone', 'skills', 'updatedAt', 'userId',
    ].sort());
    assert.equal(response.body.userId, owner._id);
    assert.equal(response.body.fullName, owner.fullName);
    assert.equal(response.body.email, owner.email);
    assert.deepEqual(response.body.skills, ['Java', 'SQL']);
    assert.equal(response.body.createdAt, '2025-02-01T00:00:00.000Z');
    assert.equal('password' in response.body, false);
    assert.equal('passwordHash' in response.body, false);
    assert.equal('role' in response.body, false);
    assert.equal('token' in response.body, false);
  });

  it('GET /api/profile rejects requests without a JWT', async () => {
    assertSafeError(await request(app).get('/api/profile'), 401);
  });

  it('GET /api/profile rejects an invalid JWT', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer invalid-token');
    assertSafeError(response, 401);
  });

  it('GET /api/profile returns 404 when the authenticated user has no profile', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${generateToken('no-profile@example.com', 'USER', testEnvironment)}`);
    assertSafeError(response, 401);

    const noProfileUser = createUser({
      id: 'profile-user-3',
      email: 'no-profile@example.com',
      fullName: 'No Profile User',
    });
    users.set(noProfileUser._id, noProfileUser);
    const missingProfile = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${generateToken(noProfileUser.email, 'USER', testEnvironment)}`);
    assertSafeError(missingProfile, 404);
    assert.equal(missingProfile.body.message, 'User profile not found');
  });

  it('PUT /api/profile upserts and normalizes only the allowed profile fields', async () => {
    const response = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        phone: '  ',
        education: '  Computer Science  ',
        college: '  New College ',
        graduationYear: 2028,
        careerGoal: ' Platform Engineer ',
        bio: null,
        location: ' Remote ',
        skills: [' Rust ', 'Rust', null, '', 'MongoDB'],
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.phone, null);
    assert.equal(response.body.education, 'Computer Science');
    assert.equal(response.body.college, 'New College');
    assert.equal(response.body.graduationYear, 2028);
    assert.equal(response.body.careerGoal, 'Platform Engineer');
    assert.equal(response.body.bio, null);
    assert.equal(response.body.location, 'Remote');
    assert.deepEqual(response.body.skills, ['Rust', 'MongoDB']);
    assert.equal(owner.profile.createdAt.toISOString(), '2025-02-01T00:00:00.000Z');
    assert.ok(owner.profile.updatedAt instanceof Date);
  });

  it('PUT /api/profile ignores a supplied user ID and cannot update another user', async () => {
    const otherProfileBefore = structuredClone(otherUser.profile);
    const response = await request(app)
      .put('/api/profile?userId=profile-user-2')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: otherUser._id,
        careerGoal: 'Owner Goal',
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.userId, owner._id);
    assert.equal(response.body.careerGoal, 'Owner Goal');
    assert.deepEqual(otherUser.profile, otherProfileBefore);
  });

  it('PUT /api/profile does not allow the client to change role', async () => {
    const response = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ careerGoal: 'Secure Engineer', role: 'ADMIN' });

    assert.equal(response.status, 200);
    assert.equal(owner.role, 'USER');
    assert.equal('role' in response.body, false);
  });

  it('PUT /api/profile does not allow the client to change email or auth fields', async () => {
    const response = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        careerGoal: 'Platform Engineer',
        email: 'changed@example.com',
        fullName: 'Changed Name',
        password: randomBytes(24).toString('hex'),
        passwordHash: randomBytes(32).toString('hex'),
      });

    assert.equal(response.status, 200);
    assert.equal(owner.email, 'owner@example.com');
    assert.equal(owner.fullName, 'Owner User');
    assert.equal(response.body.email, 'owner@example.com');
    assert.equal('password' in response.body, false);
    assert.equal('passwordHash' in response.body, false);
  });

  it('PUT /api/profile rejects values outside the Spring validation constraints', async () => {
    const response = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        phone: 'p'.repeat(31),
        graduationYear: 1800,
        skills: ['s'.repeat(81)],
      });

    assertSafeError(response, 400);
    assert.equal(response.body.errors.phone, 'Phone must be at most 30 characters');
    assert.equal(response.body.errors.graduationYear, 'Graduation year must be valid');
    assert.equal(response.body.errors.skills, 'Skill must be at most 80 characters');
    assert.equal(owner.profile.careerGoal, 'Backend Engineer');
  });

  it('GET /api/dashboard returns the expected metrics for the JWT user only', async () => {
    const response = await request(app)
      .get('/api/dashboard?userId=profile-user-2')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.userId, owner._id);
    assert.equal(response.body.fullName, owner.fullName);
    assert.equal(response.body.email, owner.email);
    assert.equal(response.body.profileCompletionPercentage, 100);
    assert.equal(response.body.skillCount, 2);
    assert.equal(response.body.profileStatus, 'COMPLETE');
    assert.equal(response.body.careerOverview.profileStatus, 'COMPLETE');
    assert.equal(response.body.applicationOverview.total, 0);
    assert.equal(response.body.applicationOverview.activeTotal, 0);
    assert.deepEqual(response.body.followUps.overdue, []);
    assert.deepEqual(response.body.followUps.upcoming, []);
    assert.deepEqual(response.body.recentAnalyses, []);
    assert.equal(response.body.careerOverview.plan, null);
    assert.equal(response.body.meta.timezone, 'UTC');
    assert.ok(Number.isFinite(Date.parse(response.body.meta.generatedAt)));
    assert.notEqual(response.body.userId, otherUser._id);
    assert.equal('password' in response.body, false);
    assert.equal('passwordHash' in response.body, false);
    assert.equal('role' in response.body, false);
  });

  it('GET /api/dashboard rejects requests without a JWT', async () => {
    assertSafeError(await request(app).get('/api/dashboard'), 401);
  });

  it('GET /api/dashboard returns the Spring defaults when the user has no profile', async () => {
    const noProfileUser = createUser({
      id: 'profile-user-3',
      email: 'no-profile@example.com',
      fullName: 'No Profile User',
    });
    users.set(noProfileUser._id, noProfileUser);
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${generateToken(noProfileUser.email, 'USER', testEnvironment)}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.userId, noProfileUser._id);
    assert.equal(response.body.careerGoal, null);
    assert.equal(response.body.education, null);
    assert.equal(response.body.profileCompletionPercentage, 0);
    assert.equal(response.body.skillCount, 0);
    assert.equal(response.body.profileStatus, 'NOT_STARTED');
    assert.equal(response.body.careerOverview.profileStatus, 'NOT_STARTED');
    assert.equal(response.body.applicationOverview.total, 0);
    assert.deepEqual(response.body.nextActions.map((action) => action.id), [
      'complete-profile',
      'create-career-plan',
      'add-first-application',
      'analyze-first-job',
    ]);
  });
});

describe('Unified dashboard service', () => {
  const userId = 'a'.repeat(24);
  const now = new Date('2026-11-25T16:47:04.986Z');

  function createUserModel(profile) {
    return {
      async findById(id) {
        return id === userId
          ? { _id: userId, fullName: 'Dashboard User', email: 'dashboard@example.com', profile }
          : null;
      },
    };
  }

  function queryResult(value) {
    const query = {
      sort() { return query; },
      limit() { return query; },
      lean() { return Promise.resolve(value); },
      then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
    };
    return query;
  }

  it('returns plan progress, all application statuses, follow-up boundaries, and latest analyses', async () => {
    const plan = {
      _id: 'p'.repeat(24),
      status: 'ACTIVE',
      careerGoal: 'Backend Engineer',
      updatedAt: new Date('2026-11-24T00:00:00.000Z'),
      items: [
        { category: 'SHORT_TERM', status: 'COMPLETED', completed: true, sortOrder: 0 },
        { category: 'MEDIUM_TERM', status: 'IN_PROGRESS', completed: false, sortOrder: 1 },
        { category: 'LONG_TERM', status: 'NOT_STARTED', completed: false, sortOrder: 2 },
      ],
    };
    const overdue = [
      { _id: '1'.repeat(24), companyName: 'Yesterday Co', jobTitle: 'Engineer', status: 'APPLIED', followUpDate: new Date('2026-11-24T00:00:00.000Z'), applicationUrl: null },
    ];
    const upcoming = [
      { _id: '2'.repeat(24), companyName: 'Today Co', jobTitle: 'Developer', status: 'ASSESSMENT', followUpDate: new Date('2026-11-25T00:00:00.000Z'), applicationUrl: 'https://example.com/apply' },
    ];
    const analyses = [
      { _id: '3'.repeat(24), jobTitle: 'Backend Engineer', companyName: 'Example', overallMatchScore: 82, createdAt: new Date('2026-11-25T12:00:00.000Z') },
    ];
    const applicationModel = {
      aggregate(pipeline) {
        if (pipeline[1]?.$group?._id === '$status') {
          return Promise.resolve([
            { _id: 'SAVED', count: 1 },
            { _id: 'APPLIED', count: 2 },
            { _id: 'ASSESSMENT', count: 1 },
            { _id: 'INTERVIEW', count: 1 },
            { _id: 'OFFER', count: 1 },
            { _id: 'REJECTED', count: 1 },
            { _id: 'WITHDRAWN', count: 1 },
          ]);
        }
        return Promise.resolve([{ overdueCount: 1, upcomingCount: 1 }]);
      },
      find(filter) {
        if (filter.followUpDate?.$lt && Object.hasOwn(filter.followUpDate, '$gte')) return queryResult(upcoming);
        if (filter.followUpDate?.$lt) return queryResult(overdue);
        return queryResult([]);
      },
    };
    const service = createDashboardService({
      userModel: createUserModel(makeProfile()),
      careerPlanModel: { findOne: () => queryResult(plan) },
      applicationModel,
      jobAnalysisModel: { find: () => queryResult(analyses) },
      clock: () => now,
    });

    const response = await service.getDashboard({ id: userId });

    assert.equal(response.applicationOverview.total, 8);
    assert.equal(response.applicationOverview.activeTotal, 5);
    assert.deepEqual(response.applicationOverview.byStatus.REJECTED, 1);
    assert.deepEqual(response.applicationOverview.byStatus.WITHDRAWN, 1);
    assert.equal(response.followUps.overdueCount, 1);
    assert.equal(response.followUps.upcomingCount, 1);
    assert.equal(response.followUps.overdue[0].companyName, 'Yesterday Co');
    assert.equal(response.followUps.upcoming[0].companyName, 'Today Co');
    assert.equal(response.recentAnalyses[0].jobTitle, 'Backend Engineer');
    assert.equal(response.careerOverview.plan.progress.completedItems, 1);
    assert.equal(response.careerOverview.plan.progress.inProgressItems, 1);
    assert.equal(response.careerOverview.plan.progress.remainingItems, 2);
    assert.equal(response.careerOverview.plan.progress.completionPercent, 33);
    assert.equal(response.careerOverview.plan.progress.currentStage, 'MEDIUM_TERM');
    assert.equal(response.meta.timezone, 'UTC');
  });

  it('scopes every model query to the authenticated user and does not accept another user ID', async () => {
    let planFilter;
    let applicationFilter;
    let analysisFilter;
    const service = createDashboardService({
      userModel: createUserModel(makeProfile()),
      careerPlanModel: {
        findOne(filter) {
          planFilter = filter;
          return queryResult(null);
        },
      },
      applicationModel: {
        aggregate(pipeline) {
          applicationFilter = pipeline[0].$match;
          return Promise.resolve([]);
        },
        find(filter) {
          applicationFilter = filter;
          return queryResult([]);
        },
      },
      jobAnalysisModel: {
        find(filter) {
          analysisFilter = filter;
          return queryResult([]);
        },
      },
      clock: () => now,
    });

    await service.getDashboard({ id: userId });

    assert.equal(planFilter.user, userId);
    assert.equal(applicationFilter.userId, userId);
    assert.equal(analysisFilter.user, userId);
  });

  it('does not silently convert database failures into empty dashboard metrics', async () => {
    const failure = new Error('database unavailable');
    const service = createDashboardService({
      userModel: createUserModel(makeProfile()),
      careerPlanModel: { findOne: () => queryResult(null) },
      applicationModel: {
        aggregate() { return Promise.reject(failure); },
        find() { return queryResult([]); },
      },
      jobAnalysisModel: { find: () => queryResult([]) },
      clock: () => now,
    });

    await assert.rejects(
      () => service.getDashboard({ id: userId }),
      (error) => error === failure,
    );
  });

  it('generates only relevant next actions for a complete new dashboard', async () => {
    const service = createDashboardService({
      userModel: createUserModel(makeProfile()),
      careerPlanModel: { findOne: () => queryResult(null) },
      applicationModel: {
        aggregate() { return Promise.resolve([]); },
        find() { return queryResult([]); },
      },
      jobAnalysisModel: { find: () => queryResult([]) },
      clock: () => now,
    });

    const response = await service.getDashboard({ id: userId });
    assert.deepEqual(response.nextActions.map((action) => action.id), [
      'create-career-plan',
      'add-first-application',
      'analyze-first-job',
    ]);
  });

  it('uses UTC today and the seven-day boundary and excludes rejected or withdrawn applications', async () => {
    let overdueFilter;
    let upcomingFilter;
    const service = createDashboardService({
      userModel: createUserModel(makeProfile()),
      careerPlanModel: { findOne: () => queryResult(null) },
      applicationModel: {
        aggregate(pipeline) {
          if (pipeline[1]?.$group?._id === '$status') return Promise.resolve([]);
          return Promise.resolve([{ overdueCount: 2, upcomingCount: 1 }]);
        },
        find(filter) {
          if (filter.followUpDate?.$lt && Object.hasOwn(filter.followUpDate, '$gte')) {
            upcomingFilter = filter;
            return queryResult([{
              _id: 'u'.repeat(24),
              companyName: 'Boundary Co',
              jobTitle: 'Developer',
              status: 'APPLIED',
              followUpDate: new Date('2026-12-01T23:59:59.999Z'),
            }]);
          }
          overdueFilter = filter;
          return queryResult([
            { _id: 'o'.repeat(24), companyName: 'Overdue Co', jobTitle: 'Engineer', status: 'SAVED', followUpDate: new Date('2026-11-24T00:00:00.000Z') },
            { _id: 'n'.repeat(24), companyName: 'Overdue Two', jobTitle: 'Engineer II', status: 'INTERVIEW', followUpDate: new Date('2026-11-23T00:00:00.000Z') },
          ]);
        },
      },
      jobAnalysisModel: { find: () => queryResult([]) },
      clock: () => now,
    });

    const response = await service.getDashboard({ id: userId });
    assert.equal(overdueFilter.followUpDate.$lt.toISOString(), '2026-11-25T00:00:00.000Z');
    assert.equal(upcomingFilter.followUpDate.$gte.toISOString(), '2026-11-25T00:00:00.000Z');
    assert.equal(upcomingFilter.followUpDate.$lt.toISOString(), '2026-12-02T00:00:00.000Z');
    assert.deepEqual(overdueFilter.status.$in, ['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW']);
    assert.deepEqual(upcomingFilter.status.$in, ['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW']);
    assert.equal(response.followUps.overdueCount, 2);
    assert.equal(response.followUps.upcomingCount, 1);
  });

  it('limits follow-up lists and recent analyses to five records and uses aggregate counts', async () => {
    const overdue = Array.from({ length: 5 }, (_, index) => ({
      _id: String(index + 1).repeat(24),
      companyName: `Overdue ${index}`,
      jobTitle: 'Engineer',
      status: 'APPLIED',
      followUpDate: new Date(`2026-11-${String(20 + index).padStart(2, '0')}T00:00:00.000Z`),
    }));
    const upcoming = Array.from({ length: 5 }, (_, index) => ({
      _id: String(index + 6).repeat(24),
      companyName: `Upcoming ${index}`,
      jobTitle: 'Developer',
      status: 'ASSESSMENT',
      followUpDate: new Date(`2026-11-${String(25 + index).padStart(2, '0')}T00:00:00.000Z`),
    }));
    const analyses = Array.from({ length: 5 }, (_, index) => ({
      _id: String(index + 11).repeat(24),
      jobTitle: `Role ${index}`,
      companyName: `Company ${index}`,
      overallMatchScore: 80 - index,
      createdAt: new Date(`2026-11-${String(25 - index).padStart(2, '0')}T12:00:00.000Z`),
    }));
    const service = createDashboardService({
      userModel: createUserModel(makeProfile()),
      careerPlanModel: { findOne: () => queryResult(null) },
      applicationModel: {
        aggregate(pipeline) {
          if (pipeline[1]?.$group?._id === '$status') return Promise.resolve([]);
          return Promise.resolve([{ overdueCount: 7, upcomingCount: 6 }]);
        },
        find(filter) {
          if (filter.followUpDate?.$lt && Object.hasOwn(filter.followUpDate, '$gte')) return queryResult(upcoming);
          return queryResult(overdue);
        },
      },
      jobAnalysisModel: { find: () => queryResult(analyses) },
      clock: () => now,
    });

    const response = await service.getDashboard({ id: userId });
    assert.equal(response.followUps.overdue.length, 5);
    assert.equal(response.followUps.upcoming.length, 5);
    assert.equal(response.followUps.overdueCount, 7);
    assert.equal(response.followUps.upcomingCount, 6);
    assert.equal(response.recentAnalyses.length, 5);
  });

  it('treats a completed career plan as not needing a continue-plan action', async () => {
    const completedPlan = {
      _id: 'c'.repeat(24),
      status: 'COMPLETED',
      careerGoal: 'Backend Engineer',
      updatedAt: now,
      items: [
        { category: 'SHORT_TERM', status: 'COMPLETED', completed: true, sortOrder: 0 },
        { category: 'MEDIUM_TERM', status: 'COMPLETED', completed: true, sortOrder: 1 },
      ],
    };
    const service = createDashboardService({
      userModel: createUserModel(makeProfile()),
      careerPlanModel: { findOne: () => queryResult(completedPlan) },
      applicationModel: {
        aggregate() { return Promise.resolve([]); },
        find() { return queryResult([]); },
      },
      jobAnalysisModel: { find: () => queryResult([{ _id: 'r'.repeat(24), jobTitle: 'Engineer', overallMatchScore: 90, createdAt: now }]) },
      clock: () => now,
    });

    const response = await service.getDashboard({ id: userId });
    assert.equal(response.careerOverview.plan.progress.completionPercent, 100);
    assert.equal(response.careerOverview.plan.progress.remainingItems, 0);
    assert.equal(response.nextActions.some((action) => action.id === 'continue-career-plan'), false);
  });
});