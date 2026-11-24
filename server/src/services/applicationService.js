import mongoose from 'mongoose';
import JobAnalysis from '../models/JobAnalysis.js';
import JobApplication, { APPLICATION_STATUSES } from '../models/JobApplication.js';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 50;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const EDITABLE_FIELDS = [
  'companyName',
  'jobTitle',
  'location',
  'jobDescription',
  'applicationUrl',
  'salaryRange',
  'applicationDate',
  'status',
  'followUpDate',
  'notes',
];

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function asPlainObject(document) {
  if (document && typeof document.toObject === 'function') return document.toObject();
  return document;
}

function applicationResponse(document) {
  const application = asPlainObject(document);
  if (!application) return null;

  return {
    id: String(application._id ?? application.id),
    companyName: application.companyName,
    jobTitle: application.jobTitle,
    location: application.location ?? null,
    jobDescription: application.jobDescription ?? null,
    applicationUrl: application.applicationUrl ?? null,
    salaryRange: application.salaryRange ?? null,
    applicationDate: application.applicationDate ?? null,
    status: application.status,
    followUpDate: application.followUpDate ?? null,
    notes: application.notes ?? '',
    jobAnalysisId: application.jobAnalysisId == null
      ? null
      : String(application.jobAnalysisId),
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function normalizeOptionalText(value) {
  if (value == null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDate(value) {
  if (value == null || value === '') return null;
  return value instanceof Date ? value : new Date(value);
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeCursor(cursor) {
  if (cursor == null) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const value = JSON.parse(decoded);
    const updatedAt = new Date(value.updatedAt);
    if (!value
        || typeof value !== 'object'
        || !mongoose.isObjectIdOrHexString(value.id)
        || !Number.isFinite(updatedAt.getTime())
        || Buffer.from(decoded, 'utf8').toString('base64url') !== cursor) {
      throw new Error('Invalid cursor.');
    }
    return { updatedAt, id: value.id };
  } catch {
    throw createError('Invalid cursor.', 400);
  }
}

function encodeCursor(application) {
  return Buffer.from(JSON.stringify({
    updatedAt: new Date(application.updatedAt).toISOString(),
    id: String(application._id ?? application.id),
  })).toString('base64url');
}

function utcStartOfToday(now) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

export function createApplicationService({
  applicationModel = JobApplication,
  jobAnalysisModel = JobAnalysis,
  clock = () => new Date(),
} = {}) {
  async function getOwnedApplication(userId, id) {
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw createError('Application ID must be a valid MongoDB ObjectId', 400);
    }
    const application = await applicationModel.findOne({ _id: id, userId });
    if (!application) throw createError('Application was not found.', 404);
    return application;
  }

  return {
    async create(user, input) {
      const userId = user.id;
      const jobAnalysisId = input.jobAnalysisId || null;

      if (jobAnalysisId) {
        const jobAnalysis = await jobAnalysisModel.findOne({
          _id: jobAnalysisId,
          user: userId,
        });
        if (!jobAnalysis) throw createError('Job analysis was not found.', 404);

        const existing = await applicationModel.findOne({ userId, jobAnalysisId });
        if (existing) return { application: applicationResponse(existing), created: false };
      }

      const document = {
        userId,
        companyName: input.companyName.trim(),
        jobTitle: input.jobTitle.trim(),
        location: normalizeOptionalText(input.location),
        jobDescription: normalizeOptionalText(input.jobDescription),
        applicationUrl: normalizeOptionalText(input.applicationUrl),
        salaryRange: normalizeOptionalText(input.salaryRange),
        applicationDate: normalizeDate(input.applicationDate),
        status: input.status ?? 'SAVED',
        followUpDate: normalizeDate(input.followUpDate),
        notes: input.notes == null ? '' : input.notes.trim(),
        jobAnalysisId,
      };

      try {
        const application = await applicationModel.create(document);
        return { application: applicationResponse(application), created: true };
      } catch (error) {
        if (!jobAnalysisId || !isDuplicateKeyError(error)) throw error;

        const existing = await applicationModel.findOne({ userId, jobAnalysisId });
        if (!existing) throw error;
        return { application: applicationResponse(existing), created: false };
      }
    },

    async list(user, filters = {}) {
      const limit = filters.limit == null ? DEFAULT_PAGE_SIZE : Number(filters.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
        throw createError(`Limit must be between 1 and ${MAX_PAGE_SIZE}.`, 400);
      }
      if (filters.status && !APPLICATION_STATUSES.includes(filters.status)) {
        throw createError('Status filter is invalid.', 400);
      }
      const search = typeof filters.q === 'string' ? filters.q.trim() : '';
      if (search.length > 100) throw createError('Search query must be at most 100 characters.', 400);

      const filter = { userId: user.id };
      if (filters.status) filter.status = filters.status;

      const conditions = [];
      if (search) {
        const literalSearch = new RegExp(escapeRegularExpression(search), 'i');
        conditions.push({
          $or: [
            { companyName: literalSearch },
            { jobTitle: literalSearch },
          ],
        });
      }

      const cursor = decodeCursor(filters.cursor);
      if (cursor) {
        conditions.push({
          $or: [
            { updatedAt: { $lt: cursor.updatedAt } },
            { updatedAt: cursor.updatedAt, _id: { $lt: cursor.id } },
          ],
        });
      }
      if (conditions.length > 0) filter.$and = conditions;

      const documents = await applicationModel.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .limit(limit + 1)
        .lean();
      const hasMore = documents.length > limit;
      const page = hasMore ? documents.slice(0, limit) : documents;
      return {
        items: page.map(applicationResponse),
        nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
      };
    },

    async getById(user, id) {
      return applicationResponse(await getOwnedApplication(user.id, id));
    },

    async update(user, id, updates) {
      const application = await getOwnedApplication(user.id, id);
      for (const field of EDITABLE_FIELDS) {
        if (!Object.hasOwn(updates, field)) continue;
        if (['companyName', 'jobTitle'].includes(field)) {
          application[field] = updates[field].trim();
        } else if (field === 'notes') {
          application[field] = updates[field] == null ? '' : updates[field].trim();
        } else if (['applicationDate', 'followUpDate'].includes(field)) {
          application[field] = normalizeDate(updates[field]);
        } else if (['location', 'jobDescription', 'applicationUrl', 'salaryRange'].includes(field)) {
          application[field] = normalizeOptionalText(updates[field]);
        } else {
          application[field] = updates[field];
        }
      }
      await application.save();
      return applicationResponse(application);
    },

    async remove(user, id) {
      if (!mongoose.isObjectIdOrHexString(id)) {
        throw createError('Application ID must be a valid MongoDB ObjectId', 400);
      }
      const deleted = await applicationModel.findOneAndDelete({ _id: id, userId: user.id });
      if (!deleted) throw createError('Application was not found.', 404);
    },

    async stats(user) {
      const today = utcStartOfToday(clock());
      const sevenDaysFromToday = new Date(today.getTime() + 7 * DAY_IN_MILLISECONDS);
      const hasFollowUpDate = {
        $ne: [{ $ifNull: ['$followUpDate', null] }, null],
      };
      const results = await applicationModel.aggregate([
        { $match: { userId: user.id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            overdueFollowUps: {
              $sum: {
                $cond: [{
                  $and: [
                    hasFollowUpDate,
                    { $lt: ['$followUpDate', today] },
                  ],
                }, 1, 0],
              },
            },
            followUpsDueWithinSevenDays: {
              $sum: {
                $cond: [{
                  $and: [
                    hasFollowUpDate,
                    { $gte: ['$followUpDate', today] },
                    { $lt: ['$followUpDate', sevenDaysFromToday] },
                  ],
                }, 1, 0],
              },
            },
          },
        },
      ]);

      const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
      let total = 0;
      let overdueFollowUps = 0;
      let followUpsDueWithinSevenDays = 0;
      for (const result of results) {
        if (Object.hasOwn(byStatus, result._id)) byStatus[result._id] = result.count;
        total += result.count;
        overdueFollowUps += result.overdueFollowUps;
        followUpsDueWithinSevenDays += result.followUpsDueWithinSevenDays;
      }

      return { total, byStatus, overdueFollowUps, followUpsDueWithinSevenDays };
    },
  };
}
