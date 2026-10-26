import mongoose from 'mongoose';
import JobPosting from '../models/JobPosting.js';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import User from '../models/User.js';
import { JOB_DATASET_ID, normalizeSkill } from './jobDatasetService.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
const SCORE_WEIGHTS = {
  skills: 0.7,
  experience: 0.2,
  location: 0.1,
};
const MIN_ROLE_JOBS = 3;
const ROLE_INSIGHTS_CACHE_TTL_MS = 5 * 60 * 1000;
const ROLE_PROFILES = [
  {
    id: 'java-full-stack',
    matches: ['java full stack', 'java fullstack'],
    searchSkills: ['Java', 'Spring Boot', 'JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'SQL', 'REST API', 'Docker'],
    titleSignals: [['java', 'full stack', 'fullstack'], ['developer', 'engineer', 'programmer']],
  },
  {
    id: 'full-stack',
    matches: ['full stack', 'fullstack'],
    searchSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'Spring Boot', 'SQL', 'HTML', 'CSS', 'REST API', 'Docker'],
    titleSignals: [['full stack', 'fullstack'], ['developer', 'engineer']],
  },
  {
    id: 'data-scientist',
    matches: ['data scientist', 'data science'],
    searchSkills: ['Python', 'SQL', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Data Analysis'],
    titleSignals: [['data'], ['scientist', 'science']],
  },
  {
    id: 'data-analyst',
    matches: ['data analyst', 'business analyst', 'analytics'],
    searchSkills: ['Python', 'SQL', 'Data Analysis', 'Pandas', 'NumPy', 'Excel', 'Tableau', 'Power BI'],
    titleSignals: [['data', 'business'], ['analyst', 'analytics']],
  },
  {
    id: 'devops',
    matches: ['devops', 'site reliability', 'sre'],
    searchSkills: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Linux', 'Bash', 'Git', 'Terraform', 'Python'],
    titleSignals: [['devops', 'site reliability', 'sre'], ['engineer', 'developer', 'specialist']],
  },
  {
    id: 'ai-ml',
    matches: ['ai/ml', 'ai ml', 'machine learning', 'artificial intelligence'],
    searchSkills: ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-Learn', 'Pandas', 'NumPy'],
    titleSignals: [['ai', 'machine learning', 'artificial intelligence'], ['engineer', 'developer', 'scientist']],
  },
  {
    id: 'frontend',
    matches: ['frontend', 'front end', 'react developer', 'ui developer'],
    searchSkills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'Tailwind CSS', 'Vue.js', 'Angular', 'REST API', 'Git'],
    titleSignals: [['frontend', 'front end', 'react', 'angular', 'vue', 'ui'], ['developer', 'engineer', 'designer']],
  },
  {
    id: 'java-developer',
    matches: ['java developer', 'java engineer'],
    searchSkills: ['Java', 'Spring', 'Spring Boot', 'SQL', 'PostgreSQL', 'MySQL', 'REST API', 'Microservices', 'Docker'],
    titleSignals: [['java'], ['developer', 'engineer', 'programmer']],
  },
  {
    id: 'python-developer',
    matches: ['python developer', 'python engineer'],
    searchSkills: ['Python', 'Django', 'Flask', 'FastAPI', 'SQL', 'PostgreSQL', 'REST API', 'Docker'],
    titleSignals: [['python'], ['developer', 'engineer', 'programmer']],
  },
  {
    id: 'backend',
    matches: ['backend', 'back end', 'backend developer', 'backend engineer'],
    searchSkills: ['Java', 'Spring Boot', 'Python', 'Node.js', 'SQL', 'PostgreSQL', 'MySQL', 'REST API', 'Microservices', 'Docker'],
    titleSignals: [['backend', 'back end', 'server side', 'java', 'python', 'node.js'], ['developer', 'engineer', 'programmer']],
  },
  {
    id: 'software-engineer',
    matches: ['software engineer', 'software developer'],
    searchSkills: ['Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'SQL', 'Git', 'REST API', 'Docker'],
    titleSignals: [['software'], ['developer', 'engineer']],
  },
];
const TECHNICAL_SKILLS = new Set([
  'java', 'python', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'ruby', 'php',
  'html', 'css', 'react', 'react native', 'angular', 'vue.js', 'node.js', 'express.js',
  'spring', 'spring boot', 'django', 'flask', 'fastapi', 'next.js', 'sql', 'postgresql',
  'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'oracle', 'machine learning',
  'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
  'data analysis', 'rest api', 'graphql', 'microservices', 'kafka', 'rabbitmq',
]);
const TOOLS_AND_TECHNOLOGIES = new Set([
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github', 'gitlab', 'ci/cd',
  'linux', 'bash', 'jira', 'terraform', 'tableau', 'power bi', 'excel',
]);

function clientError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function estimateExperienceYears(detectedExperience = []) {
  for (const entry of detectedExperience) {
    const match = /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\b/i.exec(entry);
    if (match) return Number(match[1]);
  }
  return null;
}

function locationScore(profileLocation, jobLocation) {
  const applicantLocation = normalizeSkill(profileLocation).replace(/[^a-z0-9 ]/g, ' ').trim();
  const postingLocation = normalizeSkill(jobLocation).replace(/[^a-z0-9 ]/g, ' ').trim();
  if (!applicantLocation || !postingLocation) return 50;
  return postingLocation.includes(applicantLocation) || applicantLocation.includes(postingLocation) ? 100 : 0;
}

function experienceScore(applicantYears, jobMinimumYears) {
  if (applicantYears == null || jobMinimumYears == null) return 50;
  if (jobMinimumYears <= 0) return 100;
  return Math.min(100, Math.round((applicantYears / jobMinimumYears) * 100));
}

function mapRecommendation(job, resumeSkillSet, applicantYears, applicantLocation) {
  const normalizedSkills = [...new Set((job.normalizedSkills ?? []).map(normalizeSkill).filter(Boolean))];
  const matchedKeys = new Set(normalizedSkills.filter((skill) => resumeSkillSet.has(skill)));
  const skillMatchPercent = normalizedSkills.length === 0
    ? 0
    : Math.round((matchedKeys.size / normalizedSkills.length) * 100);
  const matchedSkills = [];
  const missingSkills = [];

  for (const [index, skill] of (job.skillNames ?? []).entries()) {
    if (matchedKeys.has(normalizeSkill(skill))) matchedSkills.push(skill);
    else missingSkills.push(skill);
    if (index >= normalizedSkills.length - 1) break;
  }

  const experienceCompatibilityPercent = experienceScore(applicantYears, job.minimumExperience);
  const locationRelevancePercent = locationScore(applicantLocation, job.location);
  const matchPercentage = Math.round(
    SCORE_WEIGHTS.skills * skillMatchPercent
      + SCORE_WEIGHTS.experience * experienceCompatibilityPercent
      + SCORE_WEIGHTS.location * locationRelevancePercent,
  );

  return {
    jobId: job.jobId,
    title: job.title,
    companyName: job.companyName,
    location: job.location,
    experience: job.experience,
    salary: job.salary,
    currency: job.currency,
    minimumExperience: job.minimumExperience,
    maximumExperience: job.maximumExperience,
    minimumSalary: job.minimumSalary,
    maximumSalary: job.maximumSalary,
    matchPercentage,
    skillMatchPercent,
    experienceCompatibilityPercent,
    locationRelevancePercent,
    matchedSkills,
    missingSkills,
    jobDescription: job.jobDescription,
    aggregateRating: job.aggregateRating,
    reviewsCount: job.reviewsCount,
  };
}

function compareRecommendations(left, right) {
  return right.matchPercentage - left.matchPercentage
    || right.skillMatchPercent - left.skillMatchPercent
    || right.matchedSkills.length - left.matchedSkills.length
    || left.title.localeCompare(right.title);
}

function scoreFormula() {
  return '70% skill match + 20% experience compatibility + 10% location relevance';
}

function normalizedTitle(title) {
  return normalizeSkill(title).replace(/[^a-z0-9+#.]+/g, ' ').trim();
}

function hasTitleSignal(normalizedJobTitle, signal) {
  return ` ${normalizedJobTitle} `.includes(` ${normalizedTitle(signal)} `);
}

function roleProfileFor(targetRole) {
  const role = normalizedTitle(targetRole);
  return ROLE_PROFILES.find((profile) => profile.matches.some((match) => role.includes(match)))
    ?? null;
}

function titleMatchesRole(title, targetRole, profile) {
  const normalizedJobTitle = normalizedTitle(title);
  if (profile) {
    return profile.titleSignals.every((signals) => signals.some((signal) => (
      hasTitleSignal(normalizedJobTitle, signal)
    )));
  }

  const genericWords = new Set(['a', 'an', 'and', 'for', 'the', 'in', 'of', 'to']);
  const roleWords = normalizedTitle(targetRole).split(' ')
    .filter((word) => word.length > 1 && !genericWords.has(word));
  return roleWords.length > 0 && roleWords.every((word) => hasTitleSignal(normalizedJobTitle, word));
}

function quantile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

function createMarketAccumulator(targetRole, profile) {
  const skillCounts = new Map();
  const skillNames = new Map();
  const experienceCounts = new Map();
  const salaryByCurrency = new Map();
  let relevantJobCount = 0;

  return {
    add(job) {
      if (!titleMatchesRole(job.title ?? '', targetRole, profile)) return;
      relevantJobCount += 1;
      for (const [index, rawSkill] of (job.skillNames ?? []).entries()) {
        const normalized = normalizeSkill(job.normalizedSkills?.[index] ?? rawSkill);
        if (!normalized) continue;
        skillCounts.set(normalized, (skillCounts.get(normalized) ?? 0) + 1);
        if (!skillNames.has(normalized)) skillNames.set(normalized, rawSkill);
      }
      if (job.experience) {
        experienceCounts.set(job.experience, (experienceCounts.get(job.experience) ?? 0) + 1);
      }
      const currency = String(job.currency ?? '').trim().toUpperCase();
      if (currency && Number.isFinite(job.minimumSalary) && job.minimumSalary > 0
        && Number.isFinite(job.maximumSalary) && job.maximumSalary >= job.minimumSalary) {
        const salary = salaryByCurrency.get(currency) ?? { minimums: [], maximums: [] };
        salary.minimums.push(job.minimumSalary);
        salary.maximums.push(job.maximumSalary);
        salaryByCurrency.set(currency, salary);
      }
    },
    summarize() {
      const commonSkills = [...skillCounts.entries()]
        .map(([normalized, jobCount]) => ({
          skill: skillNames.get(normalized),
          jobCount,
          frequencyPercent: Math.round((jobCount / relevantJobCount) * 100),
          category: TECHNICAL_SKILLS.has(normalized)
            ? 'technical'
            : TOOLS_AND_TECHNOLOGIES.has(normalized) ? 'tool' : 'other',
          normalized,
        }))
        .sort((left, right) => right.jobCount - left.jobCount || left.skill.localeCompare(right.skill));
      const requiredSkills = commonSkills
        .filter(({ jobCount }) => jobCount >= Math.max(2, Math.ceil(relevantJobCount * 0.2)))
        .slice(0, 15);
      const salaryCurrency = [...salaryByCurrency.entries()]
        .sort((left, right) => right[1].minimums.length - left[1].minimums.length)[0];
      const salaryRange = salaryCurrency && salaryCurrency[1].minimums.length >= 5
        ? {
          currency: salaryCurrency[0],
          minimum: quantile(salaryCurrency[1].minimums, 0.1),
          maximum: quantile(salaryCurrency[1].maximums, 0.9),
          jobCount: salaryCurrency[1].minimums.length,
        }
        : null;
      const enoughJobs = relevantJobCount >= MIN_ROLE_JOBS && requiredSkills.length > 0;
      return {
        status: enoughJobs ? 'available' : 'insufficient_data',
        message: enoughJobs
          ? null
          : `Not enough role-matched postings with repeated skills were found for "${targetRole}".`,
        targetRole,
        relevantJobCount,
        requiredSkills: enoughJobs ? requiredSkills.map(({ skill, jobCount, frequencyPercent, category }) => ({
          skill, jobCount, frequencyPercent, category,
        })) : [],
        commonSkills: enoughJobs ? commonSkills.slice(0, 10).map(({ skill, jobCount, frequencyPercent }) => ({
          skill, jobCount, frequencyPercent,
        })) : [],
        technicalSkills: enoughJobs
          ? commonSkills.filter(({ category }) => category === 'technical').slice(0, 10)
            .map(({ skill, jobCount, frequencyPercent }) => ({ skill, jobCount, frequencyPercent }))
          : [],
        toolsAndTechnologies: enoughJobs
          ? commonSkills.filter(({ category }) => category === 'tool').slice(0, 10)
            .map(({ skill, jobCount, frequencyPercent }) => ({ skill, jobCount, frequencyPercent }))
          : [],
        experienceRequirements: enoughJobs
          ? [...experienceCounts.entries()]
            .map(([experience, jobCount]) => ({ experience, jobCount }))
            .sort((left, right) => right.jobCount - left.jobCount || left.experience.localeCompare(right.experience))
            .slice(0, 5)
          : [],
        salaryRange: enoughJobs ? salaryRange : null,
      };
    }
  };
}

function addResumeSkillMatch(marketInsights, resumeSkills) {
  const resumeSkillSet = new Set(resumeSkills.map(normalizeSkill).filter(Boolean));
  const matchedSkills = marketInsights.requiredSkills
    .filter(({ skill }) => resumeSkillSet.has(normalizeSkill(skill)))
    .map(({ skill }) => skill);
  const missingSkills = marketInsights.requiredSkills
    .filter(({ skill }) => !resumeSkillSet.has(normalizeSkill(skill)))
    .map(({ skill }) => skill);
  return {
    ...marketInsights,
    matchedSkills,
    missingSkills,
    skillCoverage: marketInsights.requiredSkills.length === 0
      ? null
      : Math.round((matchedSkills.length / marketInsights.requiredSkills.length) * 100),
  };
}

export function createJobRecommendationService({
  jobPostingModel = JobPosting,
  resumeModel = ResumeAnalysis,
  userModel = User,
} = {}) {
  const roleInsightsCache = new Map();
  return {
    async getRecommendedJobs(authenticatedUser, { resumeAnalysisId, limit = DEFAULT_LIMIT }) {
      if (!mongoose.isObjectIdOrHexString(resumeAnalysisId)) {
        throw clientError(400, 'A valid resume analysis ID is required.');
      }
      const resultLimit = limit == null || limit === '' ? DEFAULT_LIMIT : Number(limit);
      if (!Number.isInteger(resultLimit) || resultLimit < 1 || resultLimit > MAX_LIMIT) {
        throw clientError(400, `Limit must be between 1 and ${MAX_LIMIT}.`);
      }

      const resume = await resumeModel.findOne({
        _id: resumeAnalysisId,
        user: authenticatedUser.id,
      }).select('detectedSkills detectedExperience');
      if (!resume) throw clientError(404, 'Resume analysis not found.');

      const user = await userModel.findById(authenticatedUser.id);
      if (!user) throw clientError(404, 'Authenticated user was not found.');

      const datasetAvailable = await jobPostingModel.exists({ sourceDataset: JOB_DATASET_ID });
      if (!datasetAvailable) {
        throw clientError(503, 'Job recommendations are not available because the job dataset has not been imported.');
      }

      const resumeSkillSet = new Set((resume.detectedSkills ?? []).map(normalizeSkill).filter(Boolean));
      if (resumeSkillSet.size === 0) {
        return {
          resumeAnalysisId: String(resumeAnalysisId),
          totalMatches: 0,
          scoreFormula: scoreFormula(),
          jobs: [],
        };
      }

      const cursor = jobPostingModel.find({
        sourceDataset: JOB_DATASET_ID,
        normalizedSkills: { $in: [...resumeSkillSet] },
      })
        .select([
          'jobId', 'title', 'companyName', 'location', 'experience', 'salary', 'currency',
          'minimumExperience', 'maximumExperience', 'minimumSalary', 'maximumSalary',
          'normalizedSkills', 'skillNames', 'jobDescription', 'aggregateRating', 'reviewsCount',
        ].join(' '))
        .lean()
        .cursor();
      const applicantYears = estimateExperienceYears(resume.detectedExperience);
      const applicantLocation = user.profile?.location;
      const topJobs = [];
      let totalMatches = 0;

      for await (const job of cursor) {
        const recommendation = mapRecommendation(job, resumeSkillSet, applicantYears, applicantLocation);
        if (recommendation.matchedSkills.length === 0) continue;
        totalMatches += 1;
        topJobs.push(recommendation);
        topJobs.sort(compareRecommendations);
        if (topJobs.length > resultLimit) topJobs.pop();
      }

      return {
        resumeAnalysisId: String(resumeAnalysisId),
        totalMatches,
        scoreFormula: scoreFormula(),
        jobs: topJobs,
      };
    },

    async getRoleMarketInsights({ targetRole, resumeSkills = [] }) {
      const normalizedRole = typeof targetRole === 'string' ? targetRole.trim() : '';
      const normalizedResumeSkills = [...new Set(resumeSkills.map(normalizeSkill).filter(Boolean))];
      if (!normalizedRole) {
        return {
          status: 'insufficient_data',
          message: 'Select a target role to compare this resume with job-market requirements.',
          targetRole: null,
          searchBasis: null,
          relevantJobCount: 0,
          requiredSkills: [],
          commonSkills: [],
          technicalSkills: [],
          toolsAndTechnologies: [],
          experienceRequirements: [],
          salaryRange: null,
          matchedSkills: [],
          missingSkills: [],
          skillCoverage: null,
        };
      }
      const profile = roleProfileFor(normalizedRole);
      const searchSkills = [...new Set(
        (profile?.searchSkills ?? normalizedResumeSkills).map(normalizeSkill).filter(Boolean),
      )];
      if (searchSkills.length === 0) {
        return {
          status: 'insufficient_data',
          message: 'No detected or role-related skills are available to find comparable postings.',
          targetRole: normalizedRole,
          searchBasis: 'detected_resume_skills',
          relevantJobCount: 0,
          requiredSkills: [],
          commonSkills: [],
          technicalSkills: [],
          toolsAndTechnologies: [],
          experienceRequirements: [],
          salaryRange: null,
          matchedSkills: [],
          missingSkills: [],
          skillCoverage: null,
        };
      }

      const cacheKey = `${normalizedRole.toLocaleLowerCase()}|${searchSkills.sort().join(',')}`;
      const cached = roleInsightsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return addResumeSkillMatch(cached.summary, normalizedResumeSkills);
      }

      const datasetAvailable = await jobPostingModel.exists({ sourceDataset: JOB_DATASET_ID });
      if (!datasetAvailable) {
        const error = clientError(503, 'Job-market analysis is unavailable because the job dataset has not been imported.');
        throw error;
      }

      const cursor = jobPostingModel.find({
        sourceDataset: JOB_DATASET_ID,
        normalizedSkills: { $in: searchSkills },
      })
        .select('title currency experience minimumSalary maximumSalary normalizedSkills skillNames')
        .lean()
        .cursor();
      const accumulator = createMarketAccumulator(normalizedRole, profile);
      for await (const job of cursor) accumulator.add(job);
      const summary = {
        ...accumulator.summarize(),
        searchBasis: profile ? 'role_profile' : 'detected_resume_skills',
      };
      roleInsightsCache.set(cacheKey, {
        expiresAt: Date.now() + ROLE_INSIGHTS_CACHE_TTL_MS,
        summary,
      });
      if (roleInsightsCache.size > 50) {
        const oldestKey = roleInsightsCache.keys().next().value;
        if (oldestKey) roleInsightsCache.delete(oldestKey);
      }
      return addResumeSkillMatch(summary, normalizedResumeSkills);
    },
  };
}
