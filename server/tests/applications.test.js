import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import JobApplication, { APPLICATION_STATUSES } from '../src/models/JobApplication.js';
import { extractAuthentication, generateToken } from '../src/utils/jwt.js';

const testEnvironment = {
  JWT_SECRET: randomBytes(32).toString('hex'),
  JWT_EXPIRATION: '3600000',
};
const OWNER_ID = 'a'.repeat(24);
const OTHER_ID = 'b'.repeat(24);
const ANALYSIS_ID = 'c'.repeat(24);
const OTHER_ANALYSIS_ID = 'd'.repeat(24);
const STATS_NOW = new Date('2026-11-24T12:00:00.000Z');

function createUserModel() {
  const users = [
    { _id: OWNER_ID, email: 'application-owner@example.com', fullName: 'Owner', role: 'USER' },
    { _id: OTHER_ID, email: 'application-other@example.com', fullName: 'Other', role: 'USER' },
  ];
  return {
    async findOne({ email }) {
      return users.find((user) => user.email === email) ?? null;
    },
  };
}

function comparable(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toString === 'function') return value.toString();
  return value;
}

function matches(record, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$and') return expected.every((condition) => matches(record, condition));
    if (key === '$or') return expected.some((condition) => matches(record, condition));

    const actual = record[key];
    if (expected instanceof RegExp) return expected.test(String(actual ?? ''));
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      if (expected.$regex) {
        return new RegExp(expected.$regex, expected.$options).test(String(actual ?? ''));
      }
      return Object.entries(expected).every(([operator, operand]) => {
        const left = comparable(actual);
        const right = comparable(operand);
        if (operator === '$lt') return left < right;
        if (operator === '$gte') return left >= right;
        if (operator === '$ne') return left !== right;
        return false;
      });
    }
    return comparable(actual) === comparable(expected);
  });
}

function createApplicationModel() {
  const records = [];
  let raceOnNextCreate = false;
  let createdAtOffset = 0;

  function makeRecord(document) {
    const now = new Date(Date.now() + createdAtOffset++);
    const record = {
      _id: new mongoose.Types.ObjectId(),
      ...document,
      createdAt: now,
      updatedAt: now,
      async save() {
        this.updatedAt = new Date(Date.now() + createdAtOffset++);
        return this;
      },
    };
    records.push(record);
    return record;
  }

  return {
    records,
    setRaceOnNextCreate() {
      raceOnNextCreate = true;
    },
    async create(document) {
      const record = makeRecord(document);
      if (raceOnNextCreate) {
        raceOnNextCreate = false;
        const error = new Error('duplicate key');
        error.code = 11000;
        error.keyPattern = { userId: 1, jobAnalysisId: 1 };
        throw error;
      }
      return record;
    },
    findOne(filter) {
      return Promise.resolve(records.find((record) => matches(record, filter)) ?? null);
    },
    find(filter) {
      let selected = records.filter((record) => matches(record, filter));
      const query = {
        sort(order) {
          selected.sort((left, right) => {
            const updatedAtOrder = right.updatedAt.getTime() - left.updatedAt.getTime();
            if (updatedAtOrder !== 0) return updatedAtOrder;
            const leftId = String(left._id);
            const rightId = String(right._id);
            return order._id < 0 ? rightId.localeCompare(leftId) : leftId.localeCompare(rightId);
          });
          return this;
        },
        limit(count) {
          selected = selected.slice(0, count);
          return this;
        },
        lean() {
          return Promise.resolve(selected);
        },
      };
      return query;
    },
    async findOneAndDelete(filter) {
      const index = records.findIndex((record) => matches(record, filter));
      if (index < 0) return null;
      return records.splice(index, 1)[0];
    },
    async aggregate(pipeline) {
      const userId = pipeline[0].$match.userId;
      const groups = new Map();
      const overdueCondition = pipeline[1].$group.overdueFollowUps.$sum.$cond[0];
      const dueCondition = pipeline[1].$group.followUpsDueWithinSevenDays.$sum.$cond[0];
      const today = overdueCondition.$and[1].$lt[1];
      const weekEnd = dueCondition.$and[2].$lt[1];
      for (const record of records.filter((item) => String(item.userId) === String(userId))) {
        const group = groups.get(record.status) ?? {
          _id: record.status,
          count: 0,
          overdueFollowUps: 0,
          followUpsDueWithinSevenDays: 0,
        };
        group.count += 1;
        if (record.followUpDate && record.followUpDate < today) group.overdueFollowUps += 1;
        if (record.followUpDate && record.followUpDate >= today && record.followUpDate < weekEnd) {
          group.followUpsDueWithinSevenDays += 1;
        }
        groups.set(record.status, group);
      }
      return [...groups.values()];
    },
  };
}

function createJobAnalysisModel() {
  const analyses = [
    { _id: ANALYSIS_ID, user: OWNER_ID },
    { _id: OTHER_ANALYSIS_ID, user: OTHER_ID },
  ];
  return {
    async findOne(filter) {
      return analyses.find((analysis) => (
        String(analysis._id) === String(filter._id)
        && String(analysis.user) === String(filter.user)
      )) ?? null;
    },
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

describe('JobApplication model', () => {
  it('declares valid statuses, timestamps, ownership, and a partial linked-analysis unique index', () => {
    assert.deepEqual(APPLICATION_STATUSES, [
      'SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN',
    ]);

    const userId = new mongoose.Types.ObjectId();
    const value = new JobApplication({
      userId,
      companyName: '  Example Co  ',
      jobTitle: '  Engineer  ',
    });
    const response = value.toJSON();
    assert.equal(response.companyName, 'Example Co');
    assert.equal(response.jobTitle, 'Engineer');
    assert.equal(response.status, 'SAVED');
    assert.equal('userId' in response, false);
    assert.ok(value.schema.path('userId').options.select === false);

    const linkedUniqueIndex = JobApplication.schema.indexes().find(([keys, options]) => (
      keys.userId === 1 && keys.jobAnalysisId === 1 && options.unique
    ));
    assert.ok(linkedUniqueIndex);
    assert.deepEqual(linkedUniqueIndex[1].partialFilterExpression, {
      jobAnalysisId: { $type: 'objectId' },
    });
  });
});

describe('Job Applications API', () => {
  let app;
  let applicationModel;
  let ownerToken;
  let otherToken;

  beforeEach(() => {
    applicationModel = createApplicationModel();
    const authDependencies = {
      userModel: createUserModel(),
      authenticateToken: (token) => extractAuthentication(token, testEnvironment),
    };
    app = createApp({
      authDependencies,
      applicationDependencies: {
        ...authDependencies,
        applicationModel,
        jobAnalysisModel: createJobAnalysisModel(),
        clock: () => STATS_NOW,
      },
    });
    ownerToken = generateToken('application-owner@example.com', 'USER', testEnvironment);
    otherToken = generateToken('application-other@example.com', 'USER', testEnvironment);
  });

  const createRequest = (token = ownerToken) => request(app)
    .post('/api/applications')
    .set('Authorization', `Bearer ${token}`)
    .send({ companyName: 'Example Co', jobTitle: 'Backend Engineer' });

  it('requires authentication for application endpoints', async () => {
    assertSafeError(await request(app).get('/api/applications'), 401);
    assertSafeError(await request(app).get('/api/applications/stats'), 401);
    assertSafeError(await request(app).post('/api/applications').send({
      companyName: 'Example Co',
      jobTitle: 'Engineer',
    }), 401);
  });

  it('creates an application owned by the authenticated user and hides userId', async () => {
    const response = await createRequest();

    assert.equal(response.status, 201);
    assert.equal(response.body.companyName, 'Example Co');
    assert.equal(response.body.jobTitle, 'Backend Engineer');
    assert.equal(response.body.status, 'SAVED');
    assert.equal(response.body.applicationDate, null);
    assert.equal(response.body.followUpDate, null);
    assert.equal(response.body.notes, '');
    assert.equal(response.body.jobAnalysisId, null);
    assert.equal('userId' in response.body, false);
    assert.equal(String(applicationModel.records[0].userId), OWNER_ID);
  });

  it('rejects missing required fields and client-supplied ownership fields', async () => {
    const missing = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Example Co' });
    assertSafeError(missing, 400);
    assert.ok(missing.body.errors.jobTitle);

    const massAssignment = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Example Co', jobTitle: 'Engineer', userId: OTHER_ID });
    assertSafeError(massAssignment, 400);
    assert.ok(massAssignment.body.errors.userId);
  });

  it('rejects invalid status, dates, and non-HTTP application URLs', async () => {
    const invalidStatus = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Example Co', jobTitle: 'Engineer', status: 'PENDING' });
    assertSafeError(invalidStatus, 400);

    const invalidDate = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Example Co', jobTitle: 'Engineer', applicationDate: 'not-a-date' });
    assertSafeError(invalidDate, 400);

    const unsafeUrl = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Example Co', jobTitle: 'Engineer', applicationUrl: 'javascript:alert(1)' });
    assertSafeError(unsafeUrl, 400);

    const malformedUrl = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Example Co', jobTitle: 'Engineer', applicationUrl: 'http://' });
    assertSafeError(malformedUrl, 400);

    const malformedAnalysisId = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Example Co', jobTitle: 'Engineer', jobAnalysisId: 'not-an-object-id' });
    assertSafeError(malformedAnalysisId, 400);
  });

  it('rejects fields that exceed model validation bounds', async () => {
    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'x'.repeat(121), jobTitle: 'Engineer' });
    assertSafeError(response, 400);
  });

  it('lists only owned applications and supports status and literal search filters', async () => {
    const first = await createRequest();
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Other Labs', jobTitle: 'Data Engineer', status: 'INTERVIEW' });
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ companyName: 'Example Co', jobTitle: 'Backend Engineer' });

    const response = await request(app)
      .get('/api/applications?status=SAVED&q=example')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.items.map((item) => item.id), [first.body.id]);
    assert.equal(response.body.nextCursor, null);
    assert.equal('userId' in response.body.items[0], false);
  });

  it('allows legitimate manual applications with the same company and job title', async () => {
    const first = await createRequest();
    const second = await createRequest();

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.notEqual(first.body.id, second.body.id);
    assert.equal(applicationModel.records.length, 2);
  });

  it('paginates by updatedAt and _id with a maximum page size of 50', async () => {
    for (let index = 0; index < 3; index += 1) {
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ companyName: `Company ${index}`, jobTitle: `Engineer ${index}` });
    }

    const firstPage = await request(app)
      .get('/api/applications?limit=2')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(firstPage.status, 200);
    assert.equal(firstPage.body.items.length, 2);
    assert.ok(firstPage.body.nextCursor);

    const secondPage = await request(app)
      .get(`/api/applications?limit=2&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(secondPage.status, 200);
    assert.equal(secondPage.body.items.length, 1);
    assert.notEqual(firstPage.body.items[0].id, secondPage.body.items[0].id);

    const tooMany = await request(app)
      .get('/api/applications?limit=51')
      .set('Authorization', `Bearer ${ownerToken}`);
    assertSafeError(tooMany, 400);
  });

  it('rejects malformed cursors and unsupported query parameters', async () => {
    const invalidCursor = await request(app)
      .get('/api/applications?cursor=not-a-cursor')
      .set('Authorization', `Bearer ${ownerToken}`);
    assertSafeError(invalidCursor, 400);

    const unsupported = await request(app)
      .get(`/api/applications?userId=${OTHER_ID}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assertSafeError(unsupported, 400);
  });

  it('returns an owned application and hides another user application', async () => {
    const own = await createRequest();
    const foreign = await createRequest(otherToken);

    const ownDetail = await request(app)
      .get(`/api/applications/${own.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownDetail.status, 200);
    assert.equal(ownDetail.body.id, own.body.id);

    const foreignDetail = await request(app)
      .get(`/api/applications/${foreign.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assertSafeError(foreignDetail, 404);
  });

  it('updates only allowed fields and supports status changes', async () => {
    const created = await createRequest();
    const updated = await request(app)
      .patch(`/api/applications/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'INTERVIEW', notes: '  Prepare examples  ' });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.status, 'INTERVIEW');
    assert.equal(updated.body.notes, 'Prepare examples');
    assert.equal('userId' in updated.body, false);
  });

  it('rejects invalid, empty, and mass-assignment updates', async () => {
    const created = await createRequest();
    const invalidStatus = await request(app)
      .patch(`/api/applications/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PENDING' });
    assertSafeError(invalidStatus, 400);

    const emptyUpdate = await request(app)
      .patch(`/api/applications/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});
    assertSafeError(emptyUpdate, 400);

    const massAssignment = await request(app)
      .patch(`/api/applications/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: OTHER_ID });
    assertSafeError(massAssignment, 400);
  });

  it('does not allow another user to update or delete an application', async () => {
    const created = await createRequest();
    const update = await request(app)
      .patch(`/api/applications/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'REJECTED' });
    assertSafeError(update, 404);

    const remove = await request(app)
      .delete(`/api/applications/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    assertSafeError(remove, 404);
  });

  it('deletes an owned application', async () => {
    const created = await createRequest();
    const removed = await request(app)
      .delete(`/api/applications/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(removed.status, 204);
    assert.equal(removed.text, '');

    const detail = await request(app)
      .get(`/api/applications/${created.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assertSafeError(detail, 404);
  });

  it('rejects malformed application IDs', async () => {
    const response = await request(app)
      .get('/api/applications/not-an-object-id')
      .set('Authorization', `Bearer ${ownerToken}`);
    assertSafeError(response, 400);
  });

  it('calculates total, per-status, overdue, and upcoming follow-up statistics', async () => {
    const yesterday = new Date('2026-11-23T00:00:00.000Z');
    const inThreeDays = new Date('2026-11-27T00:00:00.000Z');

    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Overdue Co', jobTitle: 'Engineer', followUpDate: yesterday.toISOString() });
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ companyName: 'Upcoming Co', jobTitle: 'Engineer', status: 'INTERVIEW', followUpDate: inThreeDays.toISOString() });
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ companyName: 'Other User Co', jobTitle: 'Engineer' });

    const response = await request(app)
      .get('/api/applications/stats')
      .set('Authorization', `Bearer ${ownerToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.total, 2);
    assert.equal(response.body.byStatus.SAVED, 1);
    assert.equal(response.body.byStatus.INTERVIEW, 1);
    assert.equal(response.body.byStatus.OFFER, 0);
    assert.equal(response.body.overdueFollowUps, 1);
    assert.equal(response.body.followUpsDueWithinSevenDays, 1);
  });

  it('verifies JobAnalysis ownership and returns an existing linked application', async () => {
    const foreignAnalysis = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        companyName: 'Other Company',
        jobTitle: 'Engineer',
        jobAnalysisId: OTHER_ANALYSIS_ID,
      });
    assertSafeError(foreignAnalysis, 404);

    const linkedInput = {
      companyName: 'Example Co',
      jobTitle: 'Backend Engineer',
      jobAnalysisId: ANALYSIS_ID,
    };
    const first = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(linkedInput);
    const duplicate = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(linkedInput);

    assert.equal(first.status, 201);
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.id, first.body.id);
    assert.equal(applicationModel.records.length, 1);
  });

  it('recovers from a duplicate-key race by returning the existing linked application', async () => {
    applicationModel.setRaceOnNextCreate();
    const response = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        companyName: 'Example Co',
        jobTitle: 'Backend Engineer',
        jobAnalysisId: ANALYSIS_ID,
      });

    assert.equal(response.status, 200);
    assert.equal(response.body.jobAnalysisId, ANALYSIS_ID);
    assert.equal(applicationModel.records.length, 1);
  });
});
