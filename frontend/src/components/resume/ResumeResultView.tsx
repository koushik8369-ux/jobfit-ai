import React from 'react';
import type { ResumeAnalysisResponse } from '../../types';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Sparkles,
  RefreshCw,
  Target,
  FileText,
  Mail,
  Phone,
  BadgeCheck,
  MapPin,
} from 'lucide-react';

interface ResumeResultViewProps {
  analysis: ResumeAnalysisResponse;
  onReset: () => void;
}

export const ResumeResultView: React.FC<ResumeResultViewProps> = ({ analysis, onReset }) => {
  const roleAtsBreakdownLabels: Array<[string, string, number]> = [
    ['keywordCoverage', 'Role-market keywords', 40],
    ['contactInformation', 'Contact information', 10],
    ['summary', 'Summary', 10],
    ['skills', 'Skills section', 10],
    ['experience', 'Experience section', 10],
    ['education', 'Education', 5],
    ['projects', 'Projects', 5],
    ['certifications', 'Certifications', 5],
    ['actionVerbs', 'Action verbs', 3],
    ['quantifiedAchievements', 'Quantified achievements', 2],
  ];
  const atsChecks: Array<{ title: string; entries: string[] }> = [
    { title: 'Sections to add', entries: analysis.atsAnalysis?.missingSections ?? [] },
    { title: 'Areas to strengthen', entries: analysis.atsAnalysis?.weakSections ?? [] },
    {
      title: 'Action verbs',
      entries: analysis.atsAnalysis?.actionVerbs?.matches ?? [],
    },
    {
      title: 'Quantified achievements',
      entries: analysis.atsAnalysis?.quantifiedAchievements?.examples ?? [],
    },
    { title: 'Content checks', entries: analysis.atsAnalysis?.contentIssues ?? [] },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 65) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 80) return 'Strong Resume';
    if (score >= 65) return 'Moderate Resume';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Bar with Score Summary */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
                {analysis.fileName}
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                {new Date(analysis.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Target Role: <span className="font-semibold text-slate-200">{analysis.targetRole || 'General Software Engineer'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all duration-200 shadow-md shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Analyze Another Resume</span>
        </button>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall ATS Score Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-brand-400" />
              Resume Score
            </p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-100">
                {analysis.overallScore}
              </span>
              <span className="text-sm text-slate-400 font-medium">/ 100</span>
            </div>
            <div className="mt-3">
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${getScoreColor(analysis.overallScore)}`}>
                {getScoreBadgeText(analysis.overallScore)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400">
              {([
                ['Contact information', analysis.scoreBreakdown?.contactInformation],
                ['Summary', analysis.scoreBreakdown?.summary],
                ['Skills', analysis.scoreBreakdown?.skills],
                ['Role keywords', analysis.scoreBreakdown?.targetKeywords],
                ['Experience', analysis.scoreBreakdown?.experience],
                ['Education', analysis.scoreBreakdown?.education],
                ['Projects', analysis.scoreBreakdown?.projects],
                ['Certifications', analysis.scoreBreakdown?.certifications],
                ['Completeness', analysis.scoreBreakdown?.completeness],
              ] as Array<[string, number | undefined]>).map(([label, score]) => (
                <span key={label}>{label}: <strong className="text-slate-200">{score ?? 0}</strong></span>
              ))}
            </div>
          </div>
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-brand-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${analysis.overallScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-lg font-bold text-slate-100">{analysis.overallScore}%</span>
          </div>
        </div>

        {/* Target Job Role Match Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-purple-400" />
              Role Fit Match
            </p>
            <div className="flex items-baseline gap-3 mt-2">
              {analysis.matchScore != null
                ? <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-purple-300">{analysis.matchScore}%</span>
                : <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-400">Unavailable</span>}
            </div>
            {analysis.matchScore != null
              ? (
                <p className="text-xs text-slate-400 mt-3">
                  Matched against <span className="text-slate-200 font-medium">{analysis.targetRole}</span>
                </p>
              )
              : <p className="text-xs text-slate-400 mt-3">No configured role profile is available. See the separate Job Fit score below for market-derived evidence.</p>}
          </div>
          <div className="h-16 w-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Target className="w-8 h-8" />
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-6 sm:p-8">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Job Fit · {analysis.jobSpecificAnalysis.targetRole ?? analysis.targetRole ?? 'Target role'}
          </h3>
          {analysis.jobSpecificAnalysis.status === 'available' ? (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-5">
                <p><strong className="text-4xl text-purple-300">{analysis.jobSpecificAnalysis.jobFitScore}%</strong><span className="ml-2 text-xs text-slate-400">job fit</span></p>
                <p><strong className="text-2xl text-slate-100">{analysis.jobSpecificAnalysis.skillCoverage}%</strong><span className="ml-2 text-xs text-slate-400">skill coverage</span></p>
                <p className="text-sm text-slate-400">{analysis.jobSpecificAnalysis.marketInsights.relevantJobCount.toLocaleString()} relevant postings</p>
              </div>
              <p className="mt-4 text-xs text-slate-500">Job fit is calculated as matching role-market skills ÷ required role-market skills. The same percentage is shown as skill coverage.</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-amber-300">{analysis.jobSpecificAnalysis.message ?? 'Role-specific job data is not available.'}</p>
          )}
        </article>

        <article className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h3 className="text-lg font-bold text-slate-100">Market Insights</h3>
          {analysis.jobSpecificAnalysis.status === 'available' ? (
            <>
              <p className="mt-2 text-xs text-slate-500">
                Matching uses the {analysis.jobSpecificAnalysis.marketInsights.searchBasis === 'role_profile' ? 'selected role skill profile' : 'resume-detected skill index'} and role titles; counts reflect postings found through this indexed search.
              </p>
              {analysis.jobSpecificAnalysis.marketInsights.technicalSkills.length > 0 && (
                <p className="mt-3 text-sm text-slate-300">
                  <span className="font-semibold text-slate-100">Common technical skills: </span>
                  {analysis.jobSpecificAnalysis.marketInsights.technicalSkills.map(({ skill, frequencyPercent }) => `${skill} (${frequencyPercent}%)`).join(', ')}
                </p>
              )}
              {analysis.jobSpecificAnalysis.marketInsights.toolsAndTechnologies.length > 0 && (
                <p className="mt-3 text-sm text-slate-300">
                  <span className="font-semibold text-slate-100">Tools & technologies: </span>
                  {analysis.jobSpecificAnalysis.marketInsights.toolsAndTechnologies.map(({ skill, frequencyPercent }) => `${skill} (${frequencyPercent}%)`).join(', ')}
                </p>
              )}
              {analysis.jobSpecificAnalysis.marketInsights.experienceRequirements.length > 0 && (
                <p className="mt-3 text-sm text-slate-300">
                  <span className="font-semibold text-slate-100">Experience: </span>
                  {analysis.jobSpecificAnalysis.marketInsights.experienceRequirements.map(({ experience, jobCount }) => `${experience} (${jobCount})`).join(', ')}
                </p>
              )}
              {analysis.jobSpecificAnalysis.marketInsights.salaryRange && (
                <p className="mt-3 text-sm text-slate-300">
                  <span className="font-semibold text-slate-100">Indicative salary range: </span>
                  {analysis.jobSpecificAnalysis.marketInsights.salaryRange.currency} {analysis.jobSpecificAnalysis.marketInsights.salaryRange.minimum.toLocaleString()}–{analysis.jobSpecificAnalysis.marketInsights.salaryRange.maximum.toLocaleString()}
                  <span className="text-xs text-slate-500"> · {analysis.jobSpecificAnalysis.marketInsights.salaryRange.jobCount} postings with salary data</span>
                </p>
              )}
              {!analysis.jobSpecificAnalysis.marketInsights.technicalSkills.length
                && !analysis.jobSpecificAnalysis.marketInsights.toolsAndTechnologies.length
                && !analysis.jobSpecificAnalysis.marketInsights.experienceRequirements.length
                && !analysis.jobSpecificAnalysis.marketInsights.salaryRange && (
                  <p className="mt-3 text-sm text-slate-400">No additional experience or salary trends were reliable in the matching postings.</p>
                )}
            </>
          ) : <p className="mt-3 text-sm text-slate-400">Market statistics are shown only when enough matching postings are available.</p>}
        </article>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h3 className="text-lg font-bold text-slate-100">Skill Gap</h3>
        {analysis.jobSpecificAnalysis.status === 'available' ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-300">Matched skills</h4>
              <p className="mt-2 text-sm text-slate-300">{analysis.jobSpecificAnalysis.matchedSkills.length ? analysis.jobSpecificAnalysis.matchedSkills.join(', ') : 'No required market skills detected.'}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-amber-300">Missing skills</h4>
              <p className="mt-2 text-sm text-slate-300">{analysis.jobSpecificAnalysis.missingSkills.length ? analysis.jobSpecificAnalysis.missingSkills.join(', ') : 'No gaps among the identified required skills.'}</p>
            </div>
          </div>
        ) : <p className="mt-3 text-sm text-slate-400">Skill comparison requires sufficient dataset evidence for the selected role.</p>}
      </section>

      {(analysis.detectedName || analysis.detectedEmail || analysis.detectedPhone || analysis.detectedSummary) && (
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Profile Information Detected</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
            {analysis.detectedName && <span className="font-semibold text-slate-100">{analysis.detectedName}</span>}
            {analysis.detectedEmail && <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4 text-brand-400" />{analysis.detectedEmail}</span>}
            {analysis.detectedPhone && <span className="inline-flex items-center gap-2"><Phone className="w-4 h-4 text-brand-400" />{analysis.detectedPhone}</span>}
          </div>
          {analysis.detectedSummary && (
            <p className="mt-4 text-sm leading-relaxed text-slate-300 border-t border-slate-800 pt-4">{analysis.detectedSummary}</p>
          )}
        </section>
      )}

      {/* Detected Skills Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          Detected Technical Skills ({analysis.detectedSkills?.length || 0})
        </h3>
        {analysis.detectedSkills && analysis.detectedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {analysis.detectedSkills.map((skill, index) => (
              <span
                key={index}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-500/10 border border-brand-500/25 text-brand-300 shadow-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No specific technical skills matched automatically.</p>
        )}
        {analysis.skillCategories?.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysis.skillCategories.map(({ category, skills }) => (
              <div key={category} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">{category}</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-200">{skills.join(', ')}</p>
              </div>
            ))}
          </div>
        )}
        {analysis.strongSkills?.length > 0 && (
          <p className="mt-4 text-xs text-emerald-300">
            Repeatedly mentioned skills: {analysis.strongSkills.join(', ')}
          </p>
        )}
      </div>

      {/* Grid for Education, Experience & Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Education */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-3">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            Detected Education
          </h4>
          {analysis.detectedEducation && analysis.detectedEducation.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {analysis.detectedEducation.map((edu, i) => (
                <li key={i} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  {edu}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">None detected</p>
          )}
        </div>

        {/* Experience */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-3">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            Detected Experience
          </h4>
          {analysis.detectedExperience && analysis.detectedExperience.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {analysis.detectedExperience.map((exp, i) => (
                <li key={i} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  {exp}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">None detected</p>
          )}
        </div>

        {/* Projects */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-3">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-purple-400" />
            Detected Projects
          </h4>
          {analysis.detectedProjects && analysis.detectedProjects.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {analysis.detectedProjects.map((proj, i) => (
                <li key={i} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  {proj}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">None detected</p>
          )}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-3">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-amber-400" />
            Certifications
          </h4>
          {analysis.detectedCertifications?.length ? (
            <ul className="space-y-2 text-xs text-slate-300">
              {analysis.detectedCertifications.map((certification, index) => (
                <li key={index} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">{certification}</li>
              ))}
            </ul>
          ) : <p className="text-xs text-slate-500 italic">None detected</p>}
        </div>
      </div>

      {/* Missing Sections Alert */}
      {analysis.missingSections && analysis.missingSections.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-xl">
          <h3 className="text-base font-bold text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Missing or Improvable Resume Sections
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-200/90">
            {analysis.missingSections.map((sec, i) => (
              <li key={i} className="flex items-center gap-2 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {sec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Practical ATS-Style Checks</h3>
            <p className="mt-1 text-xs text-slate-500">Informational checks only; this is not an official ATS score.</p>
          </div>
          <span className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-sm font-bold text-brand-300">
            Checklist score: {analysis.atsAnalysis?.score ?? analysis.overallScore}/100
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h4 className="text-sm font-semibold text-slate-200">Contact details</h4>
            <p className="mt-2 text-xs text-slate-400">
              Email {analysis.atsAnalysis?.contactInformation?.emailPresent ? 'detected' : 'not detected'} ·
              Phone {analysis.atsAnalysis?.contactInformation?.phonePresent ? 'detected' : 'not detected'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <h4 className="text-sm font-semibold text-slate-200">Target-role keyword coverage</h4>
            <p className="mt-2 text-xs text-slate-400">{analysis.atsAnalysis?.keywordCoverage?.percentage ?? 0}% matched against the selected role skill list.</p>
            {analysis.atsAnalysis?.keywordCoverage?.missing?.length > 0 && (
              <p className="mt-2 text-xs text-amber-300">Not detected: {analysis.atsAnalysis.keywordCoverage.missing.join(', ')}</p>
            )}
          </div>
          {atsChecks.map(({ title, entries }) => (
            <div key={title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
              {entries.length > 0
                ? <ul className="mt-2 space-y-1 text-xs text-slate-400">{entries.map((entry) => <li key={entry}>{entry}</li>)}</ul>
                : <p className="mt-2 text-xs text-amber-300">{title === 'Action verbs' ? 'No listed action verbs detected' : title === 'Quantified achievements' ? 'No quantified outcomes detected' : 'No gaps detected'}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Role-Specific ATS-Style Analysis</h3>
            <p className="mt-1 text-xs text-slate-500">A deterministic checklist based on this resume and observed role-market skills; not a proprietary employer ATS.</p>
          </div>
          {analysis.jobSpecificAnalysis.atsAnalysis && (
            <span className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-sm font-bold text-brand-300">
              ATS-style score: {analysis.jobSpecificAnalysis.atsAnalysis.score}/100
            </span>
          )}
        </div>
        {analysis.jobSpecificAnalysis.atsAnalysis ? (
          <>
            <p className="text-sm text-slate-300">
              Keyword coverage: {analysis.jobSpecificAnalysis.atsAnalysis.keywordCoverage.percentage ?? 0}%
              {analysis.jobSpecificAnalysis.atsAnalysis.missingKeywords.length > 0
                ? ` · Missing: ${analysis.jobSpecificAnalysis.atsAnalysis.missingKeywords.join(', ')}`
                : ' · No missing role keywords detected'}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
              {roleAtsBreakdownLabels.map(([key, label, maximum]) => (
                <span key={key}>{label}: <strong className="text-slate-200">{analysis.jobSpecificAnalysis.atsAnalysis?.scoreBreakdown[key] ?? 0}/{maximum}</strong></span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Contact details: email {analysis.jobSpecificAnalysis.atsAnalysis.contactInformation.emailPresent ? 'detected' : 'not detected'}, phone {analysis.jobSpecificAnalysis.atsAnalysis.contactInformation.phonePresent ? 'detected' : 'not detected'}.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Action verbs: {analysis.jobSpecificAnalysis.atsAnalysis.actionVerbs.matches.length
                ? analysis.jobSpecificAnalysis.atsAnalysis.actionVerbs.matches.join(', ')
                : 'none detected'}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Quantified achievements: {analysis.jobSpecificAnalysis.atsAnalysis.quantifiedAchievements.examples.length
                ? analysis.jobSpecificAnalysis.atsAnalysis.quantifiedAchievements.examples.join(' · ')
                : 'none detected'}
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysis.jobSpecificAnalysis.atsAnalysis.sectionChecks.map(({ section, status }) => (
                <div key={section} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm">
                  <span className="text-slate-300">{section}</span>
                  <span className={`ml-2 text-xs ${['complete', 'present', 'detected'].includes(status) ? 'text-emerald-300' : 'text-amber-300'}`}>{status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </>
        ) : <p className="text-sm text-slate-400">{analysis.jobSpecificAnalysis.message ?? 'Role-specific ATS-style checks require sufficient market data.'}</p>}
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h3 className="text-lg font-bold text-slate-100">Job-Market Insights</h3>
        {analysis.jobMarketInsights?.status === 'unavailable' ? (
          <p className="mt-3 text-sm text-amber-300">{analysis.jobMarketInsights.message ?? 'Job-market data is currently unavailable.'}</p>
        ) : analysis.jobMarketInsights?.status !== 'available' ? (
          <p className="mt-3 text-sm text-slate-400">No job-market analysis is available for this saved result.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-400">
              {analysis.jobMarketInsights.totalMatches.toLocaleString()} dataset jobs matched the detected skills.
            </p>
            {analysis.jobMarketInsights.suitableRoles.length > 0 && (
              <p className="mt-3 text-sm text-slate-300">
                Roles among top job matches: {analysis.jobMarketInsights.suitableRoles.map(({ title, jobCount }) => `${title} (${jobCount})`).join(' · ')}
              </p>
            )}
            {analysis.jobMarketInsights.skillGaps.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-amber-300">Skills frequently requested in recommended jobs but not detected</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.jobMarketInsights.skillGaps.map(({ skill, jobCount }) => (
                    <span key={skill} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">{skill} · {jobCount} jobs</span>
                  ))}
                </div>
              </div>
            )}
            {analysis.jobMarketInsights.commonSkills.length > 0 && (
              <p className="mt-4 text-xs text-slate-400">Frequently listed skills: {analysis.jobMarketInsights.commonSkills.map(({ skill }) => skill).join(', ')}</p>
            )}
            {analysis.jobMarketInsights.jobs.length > 0 && (
              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {analysis.jobMarketInsights.jobs.map((job) => (
                  <article key={job.jobId} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-slate-100">{job.title}</h4>
                        <p className="mt-1 text-xs text-slate-400">{job.companyName ?? 'Company not listed'}{job.location ? ` · ${job.location}` : ''}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-300">{job.matchPercentage}% match</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {job.experience ?? 'Experience not listed'}{job.salary ? ` · ${job.salary}` : ''}
                      {job.aggregateRating != null ? ` · ★ ${job.aggregateRating}${job.reviewsCount != null ? ` (${job.reviewsCount})` : ''}` : ''}
                    </p>
                    {job.jobDescription && <p className="mt-3 text-xs leading-relaxed text-slate-400 line-clamp-3">{job.jobDescription}</p>}
                    {job.matchedSkills.length > 0 && <p className="mt-3 text-xs text-emerald-300">Matched: {job.matchedSkills.join(', ')}</p>}
                    {job.missingSkills.length > 0 && <p className="mt-1 text-xs text-amber-300">Gaps: {job.missingSkills.slice(0, 6).join(', ')}</p>}
                    <p className="mt-3 text-xs text-slate-500 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />No application link supplied by dataset</p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h3 className="text-lg font-bold text-slate-100">Prioritized Recommendations</h3>
        {(['HIGH', 'MEDIUM', 'OPTIONAL'] as const).map((priority) => {
          const recommendations = analysis.jobSpecificAnalysis.recommendations.filter((item) => item.priority === priority);
          if (recommendations.length === 0) return null;
          return (
            <div key={priority} className="mt-4">
              <h4 className={`text-xs font-bold uppercase tracking-wide ${priority === 'HIGH' ? 'text-red-300' : priority === 'MEDIUM' ? 'text-amber-300' : 'text-slate-400'}`}>{priority} PRIORITY</h4>
              <ul className="mt-2 space-y-2">
                {recommendations.map(({ message, skill }, index) => <li key={`${skill ?? priority}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm leading-relaxed text-slate-300">{message}</li>)}
              </ul>
            </div>
          );
        })}
        {analysis.jobSpecificAnalysis.recommendations.length === 0 && <p className="mt-3 text-sm text-slate-400">No role-specific recommendations are available without sufficient job-market data.</p>}
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <h3 className="text-lg font-bold text-slate-100">Resume Improvement</h3>
        <p className="mt-1 text-xs text-slate-500">Suggested structures use placeholders where candidate-specific results are unknown.</p>
        {analysis.jobSpecificAnalysis.bulletImprovements.length > 0 ? (
          <div className="mt-4 space-y-4">
            {analysis.jobSpecificAnalysis.bulletImprovements.map(({ original, suggestedRewrite, guidance }, index) => (
              <article key={`${original}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Weak bullet</p>
                <p className="mt-1 text-sm text-slate-300">{original}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-300">Suggested rewrite structure</p>
                <p className="mt-1 text-sm text-slate-200">{suggestedRewrite}</p>
                <p className="mt-2 text-xs text-slate-500">{guidance}</p>
              </article>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-slate-400">No common weak bullet patterns were detected in the extracted experience or projects.</p>}
      </section>

      {/* Improvement Suggestions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Evidence-Based Improvement Recommendations
        </h3>
        <ul className="space-y-3 text-sm text-slate-300">
          {analysis.improvementSuggestions?.map((sug, i) => (
            <li key={i} className="flex items-start gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <span className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{sug}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
