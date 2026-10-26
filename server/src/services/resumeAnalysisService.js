import mongoose from 'mongoose';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import { createJobRecommendationService } from './jobRecommendationService.js';
import { createResumeParserService } from './resumeParserService.js';

const COMMON_SKILLS = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP',
  'HTML', 'CSS', 'SQL', 'React', 'React Native', 'Angular', 'Vue.js', 'Node.js', 'Express.js',
  'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI', 'Next.js', 'Tailwind CSS', 'Bootstrap',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite', 'Oracle',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'GitHub', 'GitLab', 'CI/CD',
  'REST API', 'GraphQL', 'Microservices', 'Kafka', 'RabbitMQ', 'Linux', 'Bash',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-Learn', 'Pandas', 'NumPy',
  'Data Analysis', 'Agile', 'Scrum', 'Jira', 'Unit Testing', 'JUnit', 'Jest', 'Cypress',
];

const ROLE_SKILLS_MAP = {
  'frontend developer': ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'Tailwind CSS', 'Vue.js', 'Angular', 'REST API', 'Git'],
  'backend developer': ['Java', 'Spring Boot', 'Python', 'Node.js', 'SQL', 'PostgreSQL', 'MySQL', 'REST API', 'Microservices', 'Docker'],
  'full stack developer': ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'Spring Boot', 'SQL', 'HTML', 'CSS', 'Git', 'Docker', 'REST API'],
  'data scientist': ['Python', 'SQL', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Data Analysis'],
  'devops engineer': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Bash', 'Git', 'Terraform', 'Python', 'Microservices'],
};

const SKILL_CATEGORIES = {
  Languages: ['Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP'],
  'Web & UI': ['HTML', 'CSS', 'React', 'React Native', 'Angular', 'Vue.js', 'Next.js', 'Tailwind CSS', 'Bootstrap'],
  Backend: ['Node.js', 'Express.js', 'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI', 'REST API', 'GraphQL', 'Microservices'],
  Data: ['SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite', 'Oracle', 'Pandas', 'NumPy', 'Data Analysis'],
  Cloud: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'],
  'ML & AI': ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-Learn'],
  'Tools & Practices': ['Git', 'GitHub', 'GitLab', 'CI/CD', 'Linux', 'Bash', 'Agile', 'Scrum', 'Jira', 'Unit Testing', 'JUnit', 'Jest', 'Cypress', 'Kafka', 'RabbitMQ'],
};

const SECTION_HEADINGS = {
  summary: /^(?:professional\s+)?(?:summary|profile|objective|about\s+me)(?:\s*[:\-].*)?$/i,
  skills: /^(?:technical\s+)?(?:skills|technologies|technical\s+stack|core\s+competencies)(?:\s*[:\-].*)?$/i,
  experience: /^(?:work\s+)?(?:experience|employment\s+history|work\s+history|professional\s+experience)(?:\s*[:\-].*)?$/i,
  education: /^(?:education|academic\s+background|qualifications?)(?:\s*[:\-].*)?$/i,
  projects: /^(?:personal\s+|key\s+|academic\s+)?projects(?:\s*[:\-].*)?$/i,
  certifications: /^(?:certifications?|licenses?|training|certifications?\s*(?:and|&)\s*training)(?:\s*[:\-].*)?$/i,
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function skillPattern(skill, flags = 'i') {
  const trailingBoundary = /[a-z0-9]$/i.test(skill) ? '\\b' : '(?![a-z0-9])';
  return new RegExp(`\\b${escapeRegex(skill.toLocaleLowerCase())}${trailingBoundary}`, flags);
}

function extractSkills(text) {
  const lowerText = text.toLocaleLowerCase()
    .replace(/\breact\.js\b/g, 'react')
    .replace(/(^|[^a-z0-9.])js\b/g, '$1javascript')
    .replace(/\bnode\b(?!\.js)/g, 'node.js')
    .replace(/\bspringboot\b/g, 'spring boot');
  const skills = COMMON_SKILLS.filter((skill) => (
    skillPattern(skill).test(lowerText)
  ));
  return skills.filter((skill) => !(skill === 'Spring' && skills.includes('Spring Boot')));
}

function splitSections(text) {
  const sections = {};
  let activeSection = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const heading = Object.entries(SECTION_HEADINGS).find(([, pattern]) => pattern.test(trimmed));
    if (heading) {
      activeSection = heading[0];
      sections[activeSection] ??= [];
    } else if (/^[A-Z][A-Z\s/&-]{2,40}$/.test(trimmed)) {
      activeSection = null;
    } else if (activeSection) {
      sections[activeSection].push(trimmed);
    }
  }
  return Object.fromEntries(Object.entries(sections).map(([key, lines]) => [key, lines.join('\n')]));
}

function cleanEntries(section, maxEntries = 8) {
  return [...new Set((section ?? '').split(/\r?\n/)
    .map((line) => line.trim().replace(/^[•\-*]\s*/, ''))
    .filter((line) => line.length > 2 && line.length < 300))].slice(0, maxEntries);
}

function extractEducation(text, sections) {
  const sectionEntries = cleanEntries(sections.education, 6);
  if (sectionEntries.length > 0) return sectionEntries;
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 5 && line.length < 200
      && /\b(?:bachelor|master|b\.?tech|b\.?e\.?|m\.?tech|ph\.?d|diploma|university|college|degree)\b/i.test(line))
    .slice(0, 5);
}

function extractExperience(text, sections) {
  const sectionEntries = cleanEntries(sections.experience, 12);
  if (sectionEntries.length > 0) return sectionEntries;
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12 && line.length < 250
      && /\b(?:engineer|developer|analyst|manager|consultant|intern)\b/i.test(line)
      && /\b(?:19|20)\d{2}\b|\b\d+(?:\.\d+)?\s*\+?\s*(?:years?|yrs?)\b/i.test(line))
    .slice(0, 8);
}

function extractProjects(sections) {
  return cleanEntries(sections.projects, 8);
}

function extractCertifications(text, sections) {
  const sectionEntries = cleanEntries(sections.certifications, 8);
  if (sectionEntries.length > 0) return sectionEntries;
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 5 && line.length < 200
      && /\b(?:certified|certification|license|licence)\b/i.test(line))
    .slice(0, 6);
}

function extractName(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 6);
  for (const line of lines) {
    const labelled = /^name\s*:\s*(.{2,80})$/i.exec(line);
    if (labelled) return labelled[1].trim();
  }
  return lines.find((line) => line.length <= 80
    && /^[\p{L}][\p{L} .'-]{1,70}$/u.test(line)
    && line.split(/\s+/).length >= 2
    && !/\b(?:resume|curriculum vitae|engineer|developer|analyst|manager|linkedin|github|summary|experience|education)\b/i.test(line)) ?? null;
}

function extractContacts(text) {
  const email = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] ?? null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
  return { email, phone };
}

function extractSummary(sections, text) {
  const entries = cleanEntries(sections.summary, 8);
  if (entries.length > 0) return entries.join(' ');
  return text.split(/\r?\n/)
    .slice(0, 8)
    .map((line) => line.trim())
    .find((line) => line.split(/\s+/).filter(Boolean).length >= 12
      && !/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(line)
      && !/^(?:name|phone|email)\s*:/i.test(line)) ?? null;
}

function categorizeSkills(skills) {
  return Object.entries(SKILL_CATEGORIES)
    .map(([category, knownSkills]) => ({
      category,
      skills: skills.filter((skill) => knownSkills.includes(skill)),
    }))
    .filter((item) => item.skills.length > 0);
}

function hasQuantifiedImpact(lines) {
  return lines.some((line) => /\b\d+(?:\.\d+)?%|\b\d+\+?\s+(?:users|clients|projects|team members)\b/i.test(line));
}

function findActionVerbs(text) {
  const actionVerbs = [
    'achieved', 'improved', 'increased', 'reduced', 'led', 'built', 'designed',
    'delivered', 'developed', 'engineered', 'managed', 'scaled',
  ];
  return actionVerbs.filter((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(text));
}

function findQuantifiedAchievements(text) {
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && hasQuantifiedImpact([line]))
    .slice(0, 10);
}

function calculateScoreBreakdown({
  contacts,
  summary,
  skills,
  targetKeywordPercentage,
  education,
  experience,
  projects,
  certifications,
}) {
  const summaryWords = summary?.split(/\s+/).filter(Boolean).length ?? 0;
  return {
    contactInformation: (contacts.email ? 5 : 0) + (contacts.phone ? 5 : 0),
    summary: summaryWords >= 40 ? 10 : summaryWords >= 15 ? 6 : summaryWords > 0 ? 3 : 0,
    skills: Math.min(15, skills.length * 2),
    targetKeywords: Math.round((targetKeywordPercentage / 100) * 10),
    experience: experience.length === 0 ? 0 : 10 + (hasQuantifiedImpact(experience) ? 10 : 5),
    education: Math.min(10, education.length * 5),
    projects: Math.min(10, projects.length * 5),
    certifications: certifications.length > 0 ? 5 : 0,
    completeness: 0,
  };
}

function calculateScore(input) {
  const breakdown = calculateScoreBreakdown(input);
  const sectionCount = [
    input.contacts.email || input.contacts.phone,
    input.summary,
    input.skills.length > 0,
    input.experience.length > 0,
    input.education.length > 0,
    input.projects.length > 0,
    input.certifications.length > 0,
  ].filter(Boolean).length;
  breakdown.completeness = Math.round((sectionCount / 7) * 10);
  return {
    overallScore: Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0)),
    scoreBreakdown: breakdown,
  };
}

function analyzeResumeSections({
  text,
  contacts,
  summary,
  skills,
  education,
  experience,
  projects,
  certifications,
  targetSkills,
}) {
  const lowerText = text.toLocaleLowerCase();
  const missingSections = [];
  const weakSections = [];
  if (!contacts.email || !contacts.phone) missingSections.push('Complete contact information');
  if (!summary) missingSections.push('Professional Summary / Objective');
  else if (summary.split(/\s+/).filter(Boolean).length < 15) weakSections.push('Professional Summary (too brief)');
  if (skills.length === 0) missingSections.push('Skills');
  else if (skills.length < 5) weakSections.push('Skills (limited detected skills)');
  if (experience.length === 0) missingSections.push('Work Experience');
  else if (!hasQuantifiedImpact(experience)) weakSections.push('Experience (no quantified impact detected)');
  if (education.length === 0) missingSections.push('Education');
  if (projects.length === 0) missingSections.push('Projects');
  if (certifications.length === 0) weakSections.push('Certifications / Training (none detected)');

  const matchedKeywords = targetSkills.filter((skill) => skills.includes(skill));
  const missingKeywords = targetSkills.filter((skill) => !matchedKeywords.includes(skill));
  const detectedActionVerbs = findActionVerbs(text);
  const quantifiedAchievements = findQuantifiedAchievements(text);
  const contentIssues = [];
  if (text.length < 400) contentIssues.push('Extracted resume text is unusually short; check whether all pages were readable.');
  if (text.length > 10000) contentIssues.push('Resume text is lengthy; consider keeping the resume focused and concise.');
  if (detectedActionVerbs.length === 0) {
    contentIssues.push('Few action verbs were detected in the extracted resume text.');
  }
  if (quantifiedAchievements.length === 0) {
    contentIssues.push('No quantified outcomes were detected in the extracted resume text.');
  }

  return {
    missingSections,
    weakSections,
    contactInformation: {
      emailPresent: Boolean(contacts.email),
      phonePresent: Boolean(contacts.phone),
      complete: Boolean(contacts.email && contacts.phone),
    },
    summaryQuality: !summary ? 'missing'
      : summary.split(/\s+/).filter(Boolean).length < 15 ? 'brief' : 'present',
    keywordCoverage: {
      targetRole: targetSkills,
      matched: matchedKeywords,
      missing: missingKeywords,
      percentage: targetSkills.length === 0 ? 0 : Math.round((matchedKeywords.length / targetSkills.length) * 100),
    },
    actionVerbs: {
      detected: detectedActionVerbs.length > 0,
      matches: detectedActionVerbs,
    },
    quantifiedAchievements: {
      detected: quantifiedAchievements.length > 0,
      examples: quantifiedAchievements,
    },
    contentIssues,
  };
}

function summarizeJobMarket(recommendations) {
  if (recommendations.status === 'unavailable') {
    return {
      status: 'unavailable',
      message: recommendations.message,
      totalMatches: 0,
      suitableRoles: [],
      commonSkills: [],
      skillGaps: [],
      jobs: [],
    };
  }

  const roles = new Map();
  const commonSkills = new Map();
  const skillGaps = new Map();
  for (const job of recommendations.jobs) {
    roles.set(job.title, (roles.get(job.title) ?? 0) + 1);
    for (const skill of [...job.matchedSkills, ...job.missingSkills]) {
      commonSkills.set(skill, (commonSkills.get(skill) ?? 0) + 1);
    }
    for (const skill of job.missingSkills) {
      skillGaps.set(skill, (skillGaps.get(skill) ?? 0) + 1);
    }
  }

  return {
    status: 'available',
    message: null,
    totalMatches: recommendations.totalMatches,
    suitableRoles: [...roles.entries()]
      .map(([title, jobCount]) => ({ title, jobCount }))
      .sort((left, right) => right.jobCount - left.jobCount || left.title.localeCompare(right.title))
      .slice(0, 5),
    commonSkills: [...commonSkills.entries()]
      .map(([skill, jobCount]) => ({ skill, jobCount }))
      .sort((left, right) => right.jobCount - left.jobCount || left.skill.localeCompare(right.skill))
      .slice(0, 10),
    skillGaps: [...skillGaps.entries()]
      .map(([skill, jobCount]) => ({ skill, jobCount }))
      .sort((left, right) => right.jobCount - left.jobCount || left.skill.localeCompare(right.skill))
      .slice(0, 8),
    jobs: recommendations.jobs.slice(0, 8),
  };
}

function generateSuggestions({ missingSections, weakSections, skills, jobMarketInsights }) {
  const suggestions = [];
  if (missingSections.length > 0) suggestions.push(`Add or clarify these sections: ${missingSections.join(', ')}.`);
  if (weakSections.includes('Professional Summary (too brief)')) {
    suggestions.push('Expand the summary with your role, experience, and relevant skills using claims you can support.');
  } else if (missingSections.includes('Professional Summary / Objective')) {
    suggestions.push('Add a concise professional summary tailored to your target role.');
  }
  if (weakSections.includes('Experience (no quantified impact detected)')) {
    suggestions.push('Add measurable outcomes to experience bullets where you can substantiate them.');
  }
  if (skills.length < 5) suggestions.push(`Make relevant skills explicit; ${skills.length} recognized skills were detected.`);
  if (jobMarketInsights.skillGaps.length > 0) {
    suggestions.push(`Consider developing skills commonly listed in matching jobs: ${jobMarketInsights.skillGaps.slice(0, 5).map((gap) => gap.skill).join(', ')}.`);
  }
  const credentialSkills = jobMarketInsights.skillGaps
    .map((gap) => gap.skill)
    .filter((skill) => ['AWS', 'Azure', 'GCP', 'Kubernetes'].includes(skill));
  if (credentialSkills.length > 0) {
    suggestions.push(`If relevant to your goals, consider a recognized certification covering ${credentialSkills.join(', ')} based on skills requested in matching jobs.`);
  }
  return [...new Set(suggestions)];
}

function unavailableJobSpecificAnalysis(targetRole, status, message) {
  return {
    status,
    message,
    targetRole,
    jobFitScore: null,
    skillCoverage: null,
    requiredSkills: [],
    matchedSkills: [],
    missingSkills: [],
    marketInsights: {
      relevantJobCount: 0,
      searchBasis: null,
      commonSkills: [],
      technicalSkills: [],
      toolsAndTechnologies: [],
      experienceRequirements: [],
      salaryRange: null,
    },
    atsAnalysis: null,
    recommendations: [],
    bulletImprovements: [],
  };
}

function createRoleAtsAnalysis(result, marketInsights) {
  const requiredSkills = marketInsights.requiredSkills.map(({ skill }) => skill);
  const matchedSkills = marketInsights.matchedSkills;
  const missingSkills = marketInsights.missingSkills;
  const sectionChecks = [
    { section: 'Contact information', status: result.detectedEmail && result.detectedPhone ? 'complete' : 'incomplete' },
    { section: 'Professional summary', status: result.detectedSummary ? 'present' : 'missing' },
    { section: 'Skills', status: result.detectedSkills.length > 0 ? 'present' : 'missing' },
    { section: 'Experience', status: result.detectedExperience.length > 0 ? 'present' : 'missing' },
    { section: 'Education', status: result.detectedEducation.length > 0 ? 'present' : 'missing' },
    { section: 'Projects', status: result.detectedProjects.length > 0 ? 'present' : 'missing' },
    { section: 'Certifications', status: result.detectedCertifications.length > 0 ? 'present' : 'missing' },
    { section: 'Action verbs', status: result.atsAnalysis.actionVerbs.detected ? 'detected' : 'not_detected' },
    { section: 'Quantified achievements', status: result.atsAnalysis.quantifiedAchievements.detected ? 'detected' : 'not_detected' },
  ];
  const keywordCoverage = marketInsights.skillCoverage;
  const scoreBreakdown = {
    keywordCoverage: keywordCoverage == null ? 0 : Math.round(keywordCoverage * 0.4),
    contactInformation: result.detectedEmail && result.detectedPhone ? 10 : result.detectedEmail || result.detectedPhone ? 5 : 0,
    summary: result.detectedSummary ? 10 : 0,
    skills: result.detectedSkills.length > 0 ? 10 : 0,
    experience: result.detectedExperience.length > 0 ? 10 : 0,
    education: result.detectedEducation.length > 0 ? 5 : 0,
    projects: result.detectedProjects.length > 0 ? 5 : 0,
    certifications: result.detectedCertifications.length > 0 ? 5 : 0,
    actionVerbs: result.atsAnalysis.actionVerbs.detected ? 3 : 0,
    quantifiedAchievements: result.atsAnalysis.quantifiedAchievements.detected ? 2 : 0,
  };

  return {
    score: Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0),
    scoreBreakdown,
    keywordCoverage: {
      percentage: keywordCoverage,
      required: requiredSkills,
      matched: matchedSkills,
      missing: missingSkills,
    },
    missingKeywords: missingSkills,
    contactInformation: result.atsAnalysis.contactInformation,
    summaryStatus: result.detectedSummary ? result.atsAnalysis.summaryQuality : 'missing',
    sectionChecks,
    actionVerbs: result.atsAnalysis.actionVerbs,
    quantifiedAchievements: result.atsAnalysis.quantifiedAchievements,
  };
}

function createRecommendations(result, marketInsights) {
  const recommendations = [];
  const gaps = marketInsights.requiredSkills
    .filter(({ skill }) => marketInsights.missingSkills.includes(skill));
  for (const gap of gaps) {
    const recommendation = {
      priority: gap.frequencyPercent >= 50 ? 'HIGH' : 'MEDIUM',
      skill: gap.skill,
      message: `${gap.skill} appears in ${gap.jobCount} of ${marketInsights.relevantJobCount} matching job postings but was not detected in your resume. Include it only if you have that experience, or consider developing the skill.`,
    };
    recommendations.push(recommendation);
  }
  if (result.detectedExperience.length > 0 && !result.atsAnalysis.quantifiedAchievements.detected) {
    recommendations.push({
      priority: 'MEDIUM',
      skill: null,
      message: 'Add measurable outcomes to experience or project bullets where you can substantiate them.',
    });
  }
  for (const section of result.missingSections) {
    recommendations.push({
      priority: 'OPTIONAL',
      skill: null,
      message: `Add or clarify the ${section.toLocaleLowerCase()} section if relevant to your background.`,
    });
  }
  return recommendations;
}

function createBulletImprovements(result) {
  const weakPattern = /^\s*(?:worked on|responsible for|helped with|did|made)\b[,: -]*/i;
  return [...result.detectedExperience, ...result.detectedProjects]
    .filter((bullet) => weakPattern.test(bullet))
    .map((original) => {
      const task = original.replace(weakPattern, '').replace(/[.!;]+$/, '').trim();
      const technologies = result.detectedSkills.filter((skill) => (
        new RegExp(`\\b${escapeRegex(skill)}\\b`, 'i').test(original)
      ));
      const technologyText = technologies.length > 0
        ? ` using ${technologies.join(', ')}`
        : ' using [relevant technology]';
      return {
        original,
        suggestedRewrite: `[Action verb] ${task || '[specific task performed]'}${technologyText} to [result you can substantiate].`,
        guidance: 'Suggested structure only. Verify every detail and replace bracketed text with accurate information; do not add unverified outcomes.',
      };
    });
}

function createJobSpecificAnalysis(result, marketInsights) {
  if (marketInsights.status !== 'available') {
    const emptyMarketInsights = {
      ...marketInsights,
      requiredSkills: [],
      matchedSkills: [],
      missingSkills: [],
      skillCoverage: null,
    };
    const unavailable = unavailableJobSpecificAnalysis(
      result.targetRole,
      marketInsights.status,
      marketInsights.message,
    );
    return {
      ...unavailable,
      atsAnalysis: createRoleAtsAnalysis(result, emptyMarketInsights),
      recommendations: createRecommendations(result, emptyMarketInsights),
      bulletImprovements: createBulletImprovements(result),
      marketInsights: {
        ...unavailable.marketInsights,
        relevantJobCount: marketInsights.relevantJobCount ?? 0,
      },
    };
  }
  const atsAnalysis = createRoleAtsAnalysis(result, marketInsights);
  return {
    status: 'available',
    message: null,
    targetRole: result.targetRole,
    jobFitScore: marketInsights.skillCoverage,
    skillCoverage: marketInsights.skillCoverage,
    requiredSkills: marketInsights.requiredSkills,
    matchedSkills: marketInsights.matchedSkills,
    missingSkills: marketInsights.missingSkills,
    marketInsights: {
      relevantJobCount: marketInsights.relevantJobCount,
      searchBasis: marketInsights.searchBasis,
      commonSkills: marketInsights.commonSkills,
      technicalSkills: marketInsights.technicalSkills,
      toolsAndTechnologies: marketInsights.toolsAndTechnologies,
      experienceRequirements: marketInsights.experienceRequirements,
      salaryRange: marketInsights.salaryRange,
    },
    atsAnalysis,
    recommendations: createRecommendations(result, marketInsights),
    bulletImprovements: createBulletImprovements(result),
  };
}

function calculateJobMatch(role, detectedSkills) {
  const normalizedRole = typeof role === 'string' ? role.toLocaleLowerCase().trim() : '';
  const targetSkills = ROLE_SKILLS_MAP[normalizedRole];
  if (!targetSkills) return null;
  const detectedSkillSet = new Set(detectedSkills);
  const matchedCount = targetSkills.filter((skill) => detectedSkillSet.has(skill)).length;
  return targetSkills.length === 0 ? 0 : Math.round((matchedCount / targetSkills.length) * 100);
}

export function analyzeResumeText(text, targetRole) {
  const sections = splitSections(text);
  const detectedSkills = extractSkills(text);
  const detectedEducation = extractEducation(text, sections);
  const detectedExperience = extractExperience(text, sections);
  const detectedProjects = extractProjects(sections);
  const detectedCertifications = extractCertifications(text, sections);
  const contacts = extractContacts(text);
  const detectedSummary = extractSummary(sections, text);
  const normalizedTargetRole = typeof targetRole === 'string' ? targetRole.trim() : '';
  const effectiveTargetRole = normalizedTargetRole || 'General Software Engineer';
  const targetSkills = ROLE_SKILLS_MAP[effectiveTargetRole.toLocaleLowerCase()]
    ?? ROLE_SKILLS_MAP['full stack developer'];
  const atsAnalysis = analyzeResumeSections({
    text,
    contacts,
    summary: detectedSummary,
    skills: detectedSkills,
    education: detectedEducation,
    experience: detectedExperience,
    projects: detectedProjects,
    certifications: detectedCertifications,
    targetSkills,
  });
  const scoreInput = {
    contacts,
    summary: detectedSummary,
    skills: detectedSkills,
    targetKeywordPercentage: atsAnalysis.keywordCoverage.percentage,
    education: detectedEducation,
    experience: detectedExperience,
    projects: detectedProjects,
    certifications: detectedCertifications,
  };

  const score = calculateScore(scoreInput);
  atsAnalysis.score = score.overallScore;
  atsAnalysis.scoreBreakdown = score.scoreBreakdown;
  return {
    overallScore: score.overallScore,
    scoreBreakdown: score.scoreBreakdown,
    targetRole: effectiveTargetRole,
    matchScore: calculateJobMatch(normalizedTargetRole, detectedSkills),
    detectedName: extractName(text),
    detectedEmail: contacts.email,
    detectedPhone: contacts.phone,
    detectedSummary,
    detectedSkills,
    skillCategories: categorizeSkills(detectedSkills),
    strongSkills: detectedSkills.filter((skill) => (
      (text.match(skillPattern(skill, 'gi')) ?? []).length > 1
    )),
    detectedEducation,
    detectedExperience,
    detectedProjects,
    detectedCertifications,
    missingSections: atsAnalysis.missingSections,
    atsAnalysis,
    jobMarketInsights: {
      status: 'pending',
      message: null,
      totalMatches: 0,
      suitableRoles: [],
      commonSkills: [],
      skillGaps: [],
      jobs: [],
    },
    improvementSuggestions: [],
    rawText: text,
  };
}

function createNotFoundError(id) {
  const error = new Error(`Resume analysis not found with ID: ${id}`);
  error.status = 404;
  return error;
}

function toResumeAnalysisResponse(analysis) {
  const id = analysis._id ?? analysis.id;
  const jobMarketInsights = analysis.jobMarketInsights?.status
    ? analysis.jobMarketInsights
    : {
      status: 'unavailable',
      message: 'Job-market insights are not available for this saved analysis.',
      totalMatches: 0,
      suitableRoles: [],
      commonSkills: [],
      skillGaps: [],
      jobs: [],
    };
  return {
    id: id.toString(),
    fileName: analysis.fileName,
    fileType: analysis.fileType ?? null,
    overallScore: analysis.overallScore,
    scoreBreakdown: { ...(analysis.scoreBreakdown ?? {}) },
    targetRole: analysis.targetRole ?? null,
    matchScore: calculateJobMatch(analysis.targetRole, analysis.detectedSkills ?? []),
    jobSpecificAnalysis: analysis.jobSpecificAnalysis?.status
      ? analysis.jobSpecificAnalysis
      : unavailableJobSpecificAnalysis(
        analysis.targetRole ?? null,
        'insufficient_data',
        'Job-specific analysis is not available for this saved result.',
      ),
    detectedName: analysis.detectedName ?? null,
    detectedEmail: analysis.detectedEmail ?? null,
    detectedPhone: analysis.detectedPhone ?? null,
    detectedSummary: analysis.detectedSummary ?? null,
    detectedSkills: [...(analysis.detectedSkills ?? [])],
    skillCategories: (analysis.skillCategories ?? []).map((category) => ({
      category: category.category,
      skills: [...category.skills],
    })),
    strongSkills: [...(analysis.strongSkills ?? [])],
    detectedEducation: [...(analysis.detectedEducation ?? [])],
    detectedExperience: [...(analysis.detectedExperience ?? [])],
    detectedProjects: [...(analysis.detectedProjects ?? [])],
    detectedCertifications: [...(analysis.detectedCertifications ?? [])],
    missingSections: [...(analysis.missingSections ?? [])],
    atsAnalysis: analysis.atsAnalysis ?? {},
    jobMarketInsights,
    weakAreas: [...(analysis.weakAreas ?? [])],
    improvementSuggestions: [...(analysis.improvementSuggestions ?? [])],
    createdAt: analysis.createdAt,
  };
}

function invalidTargetRoleError() {
  const error = new Error('Invalid target role.');
  error.status = 400;
  return error;
}

function isJobMarketUnavailableError(error) {
  return error.status === 503
    || [
      'MongoNetworkError',
      'MongoServerSelectionError',
      'MongoNotConnectedError',
      'MongoTopologyClosedError',
    ].includes(error.name)
    || (error.name === 'MongooseError' && /buffering timed out|server selection timed out/i.test(error.message));
}

export function createResumeAnalysisService({
  resumeModel = ResumeAnalysis,
  parserService = createResumeParserService(),
  analyzer = analyzeResumeText,
  jobMarketService = createJobRecommendationService({ resumeModel }),
} = {}) {
  return {
    async analyzeResume(authenticatedUser, file, targetRole) {
      if (targetRole != null && (typeof targetRole !== 'string' || targetRole.length > 100)) {
        throw invalidTargetRoleError();
      }

      const parsed = await parserService.extractText(file);
      const result = analyzer(parsed.text, targetRole);
      const saved = await resumeModel.create({
        user: authenticatedUser.id,
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        ...result,
      });
      let jobMarketInsights;
      try {
        const recommendations = await jobMarketService.getRecommendedJobs(authenticatedUser, {
          resumeAnalysisId: String(saved._id ?? saved.id),
          limit: 25,
        });
        jobMarketInsights = summarizeJobMarket(recommendations);
      } catch (error) {
        if (!isJobMarketUnavailableError(error)) throw error;
        jobMarketInsights = summarizeJobMarket({
          status: 'unavailable',
          message: error.status === 503
            ? error.message
            : 'Job-market data is temporarily unavailable; resume analysis was saved.',
        });
      }
      let jobSpecificAnalysis;
      if (!targetRole?.trim()) {
        jobSpecificAnalysis = unavailableJobSpecificAnalysis(
          result.targetRole,
          'insufficient_data',
          'Select a target role to compare this resume with role-specific job-market requirements.',
        );
        jobSpecificAnalysis = createJobSpecificAnalysis(result, {
          ...jobSpecificAnalysis,
          requiredSkills: [],
          matchedSkills: [],
          missingSkills: [],
          skillCoverage: null,
        });
        jobSpecificAnalysis.targetRole = null;
      } else if (jobMarketInsights.status === 'unavailable') {
        jobSpecificAnalysis = createJobSpecificAnalysis(result, {
          ...unavailableJobSpecificAnalysis(result.targetRole, 'unavailable', jobMarketInsights.message),
          requiredSkills: [],
          matchedSkills: [],
          missingSkills: [],
          skillCoverage: null,
        });
      } else if (typeof jobMarketService.getRoleMarketInsights !== 'function') {
        jobSpecificAnalysis = createJobSpecificAnalysis(result, {
          ...unavailableJobSpecificAnalysis(
            result.targetRole,
            'insufficient_data',
            'Role-specific market analysis is not supported by the configured job service.',
          ),
          requiredSkills: [],
          matchedSkills: [],
          missingSkills: [],
          skillCoverage: null,
        });
      } else {
        try {
          const marketInsights = await jobMarketService.getRoleMarketInsights({
            targetRole: result.targetRole,
            resumeSkills: result.detectedSkills,
          });
          jobSpecificAnalysis = createJobSpecificAnalysis(result, marketInsights);
        } catch (error) {
          if (!isJobMarketUnavailableError(error)) throw error;
          jobSpecificAnalysis = createJobSpecificAnalysis(result, {
            ...unavailableJobSpecificAnalysis(
              result.targetRole,
              'unavailable',
              error.status === 503
                ? error.message
                : 'Job-market data is temporarily unavailable; resume analysis was saved.',
            ),
            requiredSkills: [],
            matchedSkills: [],
            missingSkills: [],
            skillCoverage: null,
          });
        }
      }
      const atsAnalysis = { ...result.atsAnalysis };
      const skillGaps = jobMarketInsights.skillGaps.map((gap) => gap.skill);
      const targetMissingKeywords = atsAnalysis.keywordCoverage.missing;
      atsAnalysis.keywordCoverage = {
        ...atsAnalysis.keywordCoverage,
        jobMarketGaps: skillGaps,
      };
      const improvementSuggestions = generateSuggestions({
        missingSections: atsAnalysis.missingSections,
        weakSections: atsAnalysis.weakSections,
        skills: result.detectedSkills,
        jobMarketInsights,
      });
      const update = {
        jobMarketInsights,
        jobSpecificAnalysis,
        atsAnalysis,
        improvementSuggestions,
        weakAreas: [...new Set([...targetMissingKeywords, ...skillGaps])],
      };
      await resumeModel.updateOne(
        { _id: saved._id ?? saved.id, user: authenticatedUser.id },
        { $set: update },
      );
      const savedObject = typeof saved.toObject === 'function' ? saved.toObject() : saved;
      return toResumeAnalysisResponse({ ...savedObject, ...update });
    },

    async getHistory(authenticatedUser) {
      const analyses = await resumeModel
        .find({ user: authenticatedUser.id })
        .sort({ createdAt: -1 });
      return analyses.map(toResumeAnalysisResponse);
    },

    async getById(authenticatedUser, id) {
      if (!mongoose.isObjectIdOrHexString(id)) {
        const error = new Error('Invalid resume analysis ID.');
        error.status = 400;
        throw error;
      }

      const analysis = await resumeModel.findOne({
        _id: id,
        user: authenticatedUser.id,
      });
      if (!analysis) throw createNotFoundError(id);
      return toResumeAnalysisResponse(analysis);
    },
  };
}
