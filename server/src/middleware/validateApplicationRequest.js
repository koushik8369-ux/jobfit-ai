import mongoose from 'mongoose';
import { body, param, query, validationResult } from 'express-validator';
import { APPLICATION_STATUSES } from '../models/JobApplication.js';

const CREATE_FIELDS = new Set([
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
  'jobAnalysisId',
]);

const UPDATE_FIELDS = new Set([...CREATE_FIELDS].filter((field) => field !== 'jobAnalysisId'));
const QUERY_FIELDS = new Set(['status', 'q', 'limit', 'cursor']);

function validationError(errors) {
  const error = new Error(errors[0].msg);
  error.status = 400;
  error.errors = Object.fromEntries(errors.map(({ path, msg }) => [path, msg]));
  return error;
}

function validateResult(request, _response, next) {
  const result = validationResult(request);
  if (!result.isEmpty()) return next(validationError(result.array()));
  return next();
}

function requireJsonObject(request, _response, next) {
  if (request.body === null || typeof request.body !== 'object' || Array.isArray(request.body)) {
    const error = new Error('Request body must be a JSON object');
    error.status = 400;
    error.errors = { body: error.message };
    return next(error);
  }
  return next();
}

function rejectUnknownFields(allowedFields) {
  return (request, _response, next) => {
    const unknownFields = Object.keys(request.body)
      .filter((field) => !allowedFields.has(field));
    if (unknownFields.length === 0) return next();

    const errors = unknownFields.map((field) => ({
      path: field,
      msg: `${field} is not allowed`,
    }));
    return next(validationError(errors));
  };
}

function rejectUnknownQueryFields(request, _response, next) {
  const unknownFields = Object.keys(request.query)
    .filter((field) => !QUERY_FIELDS.has(field));
  if (unknownFields.length === 0) return next();

  const errors = unknownFields.map((field) => ({
    path: field,
    msg: `${field} is not a supported query parameter`,
  }));
  return next(validationError(errors));
}

const optionalText = (field, maximum, label = field) => (
  body(field)
    .optional({ nullable: true })
    .isString().withMessage(`${label} must be a string`).bail()
    .trim()
    .isLength({ max: maximum }).withMessage(`${label} must be at most ${maximum} characters`)
);

const optionalDate = (field, label) => (
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage(`${label} must be a valid ISO date`)
    .bail()
    .toDate()
);

const requiredText = (field, maximum, label) => (
  body(field)
    .isString().withMessage(`${label} is required`).bail()
    .trim()
    .notEmpty().withMessage(`${label} is required`).bail()
    .isLength({ max: maximum }).withMessage(`${label} must be at most ${maximum} characters`)
);

const sharedFieldRules = [
  optionalText('location', 120, 'Location'),
  optionalText('jobDescription', 20000, 'Job description'),
  optionalText('applicationUrl', 2048, 'Application URL')
    .custom((value) => {
      if (value == null || value.length === 0) return true;
      try {
        const parsed = new URL(value);
        return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname);
      } catch {
        return false;
      }
    })
    .withMessage('Application URL must be a valid HTTP or HTTPS URL'),
  optionalText('salaryRange', 100, 'Salary range'),
  optionalDate('applicationDate', 'Application date'),
  body('status')
    .optional()
    .isIn(APPLICATION_STATUSES).withMessage('Status is invalid'),
  optionalDate('followUpDate', 'Follow-up date'),
  optionalText('notes', 5000, 'Notes'),
];

export const validateCreateApplication = [
  requireJsonObject,
  rejectUnknownFields(CREATE_FIELDS),
  requiredText('companyName', 120, 'Company name'),
  requiredText('jobTitle', 160, 'Job title'),
  ...sharedFieldRules,
  body('jobAnalysisId')
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage('Job analysis ID must be a valid MongoDB ObjectId').bail()
    .trim()
    .custom((value) => mongoose.isObjectIdOrHexString(value))
    .withMessage('Job analysis ID must be a valid MongoDB ObjectId'),
  validateResult,
];

export const validateUpdateApplication = [
  requireJsonObject,
  rejectUnknownFields(UPDATE_FIELDS),
  body().custom((value) => Object.keys(value).length > 0)
    .withMessage('At least one application field must be provided'),
  body('companyName')
    .optional()
    .isString().withMessage('Company name must be a string').bail()
    .trim()
    .notEmpty().withMessage('Company name must not be empty').bail()
    .isLength({ max: 120 }).withMessage('Company name must be at most 120 characters'),
  body('jobTitle')
    .optional()
    .isString().withMessage('Job title must be a string').bail()
    .trim()
    .notEmpty().withMessage('Job title must not be empty').bail()
    .isLength({ max: 160 }).withMessage('Job title must be at most 160 characters'),
  ...sharedFieldRules,
  validateResult,
];

export const validateApplicationList = [
  rejectUnknownQueryFields,
  query('status')
    .optional()
    .isIn(APPLICATION_STATUSES).withMessage('Status filter is invalid'),
  query('q')
    .optional()
    .isString().withMessage('Search query must be a string').bail()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query must be at most 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt(),
  query('cursor')
    .optional()
    .isString().withMessage('Cursor must be a string').bail()
    .isLength({ min: 1, max: 512 }).withMessage('Cursor is invalid'),
  validateResult,
];

export const validateApplicationId = [
  param('id')
    .custom((id) => mongoose.isObjectIdOrHexString(id))
    .withMessage('Application ID must be a valid MongoDB ObjectId'),
  validateResult,
];
