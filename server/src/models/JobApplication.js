import mongoose from 'mongoose';

export const APPLICATION_STATUSES = Object.freeze([
  'SAVED',
  'APPLIED',
  'ASSESSMENT',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
]);

const jobApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    select: false,
  },
  companyName: { type: String, required: true, trim: true, maxlength: 120 },
  jobTitle: { type: String, required: true, trim: true, maxlength: 160 },
  location: { type: String, default: null, trim: true, maxlength: 120 },
  jobDescription: { type: String, default: null, trim: true, maxlength: 20000 },
  applicationUrl: { type: String, default: null, trim: true, maxlength: 2048 },
  salaryRange: { type: String, default: null, trim: true, maxlength: 100 },
  applicationDate: { type: Date, default: null },
  status: {
    type: String,
    enum: APPLICATION_STATUSES,
    required: true,
    default: 'SAVED',
  },
  followUpDate: { type: Date, default: null },
  notes: { type: String, default: '', trim: true, maxlength: 5000 },
  jobAnalysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobAnalysis',
    default: null,
  },
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform(_document, result) {
      result.id = result._id.toString();
      delete result._id;
      delete result.userId;
      return result;
    },
  },
});

jobApplicationSchema.index({ userId: 1, updatedAt: -1, _id: -1 });
jobApplicationSchema.index({ userId: 1, status: 1, updatedAt: -1, _id: -1 });
jobApplicationSchema.index({ userId: 1, followUpDate: 1 });
jobApplicationSchema.index(
  { userId: 1, jobAnalysisId: 1 },
  {
    unique: true,
    partialFilterExpression: { jobAnalysisId: { $type: 'objectId' } },
  },
);

const JobApplication = mongoose.models.JobApplication
  || mongoose.model('JobApplication', jobApplicationSchema);

export default JobApplication;
