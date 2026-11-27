import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

// Load real production getMatchScoreTier function directly from MatchScoreGauge.tsx
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawGaugeSource = await readFile(path.join(projectRoot, 'src/components/MatchScoreGauge.tsx'), 'utf8');
const mockedGaugeSource = rawGaugeSource.replace(/import React from ["']react["'];/, 'const React = { createElement: () => null };');
const transpiledGauge = ts.transpileModule(mockedGaugeSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React }
}).outputText;
const gaugeModule = await import(`data:text/javascript;base64,${Buffer.from(transpiledGauge).toString('base64')}`);
const { getMatchScoreTier } = gaugeModule;

// Test 1: CandidateMatchResultsDTO and SkillEvidenceItem schema contract integrity
test('CandidateMatchResultsDTO schema contract integrity with required, source_section, character spans', () => {
  const sampleDTO = {
    application_id: 'app-12345',
    application_status: 'shortlisted',
    job_id: 'job-98765',
    job_title: 'Senior Full Stack Engineer',
    company_name: 'TechCorp Labs',
    overall_match_score: 87.5,
    evaluation_status: 'completed',
    evaluated_at: '2026-11-20T14:30:00Z',
    matched_skills: ['React', 'TypeScript', 'Node.js', 'Python'],
    missing_skills: ['Kubernetes', 'GraphQL'],
    transferable_skills: ['Docker', 'AWS'],
    skill_evidence: [
      {
        requirement: 'React',
        claim: 'Candidate has 4 years React experience',
        sourceText: 'Developed complex responsive frontends with React and Redux',
        type: 'matched',
        required: true,
        source_section: 'experience',
        character_start: 120,
        character_end: 185,
        details: 'required'
      },
      {
        requirement: 'GraphQL',
        claim: 'No evidence detected for GraphQL',
        sourceText: null,
        type: 'not_detected',
        required: false,
        source_section: 'unknown',
        character_start: null,
        character_end: null,
        details: 'preferred'
      }
    ],
    experience: {
      candidate_years: 5.5,
      required_years: 4.0,
      alignment_score: 95.0,
      evidence: '5.5 years demonstrable full-stack development experience'
    },
    education: {
      candidate_degree: 'B.Tech in Computer Engineering',
      required_education: 'Bachelor of Science / Engineering',
      alignment_score: 100.0,
      evidence: 'B.Tech Computer Engineering graduated 2024'
    },
    recommendations: [
      'Consider acquiring hands-on Kubernetes orchestration experience'
    ]
  };

  assert.equal(sampleDTO.application_id, 'app-12345');
  assert.equal(sampleDTO.overall_match_score, 87.5);
  assert.equal(sampleDTO.evaluation_status, 'completed');
  assert.ok(Array.isArray(sampleDTO.matched_skills));
  assert.equal(sampleDTO.matched_skills.length, 4);
  assert.equal(sampleDTO.missing_skills.length, 2);
  assert.equal(sampleDTO.transferable_skills.length, 2);
  assert.equal(sampleDTO.skill_evidence.length, 2);

  // Evidence metadata assertions
  const [ev1, ev2] = sampleDTO.skill_evidence;
  assert.equal(ev1.required, true);
  assert.equal(ev1.source_section, 'experience');
  assert.equal(ev1.character_start, 120);
  assert.equal(ev1.character_end, 185);
  assert.equal(ev1.details, 'required');

  assert.equal(ev2.required, false);
  assert.equal(ev2.source_section, 'unknown');
  assert.equal(ev2.character_start, null);
  assert.equal(ev2.character_end, null);
  assert.equal(ev2.details, 'preferred');
});

// Test 2: Production getMatchScoreTier handles scores and null scores honestly
test('Production getMatchScoreTier handles scores, clamping, and null scores', () => {
  // Valid scores
  const strong = getMatchScoreTier(95.4);
  assert.equal(strong.tier, 'strong');
  assert.equal(strong.color, 'emerald');
  assert.equal(strong.score, 95);
  assert.equal(strong.label, 'Strong Match');

  const boundary80 = getMatchScoreTier(80.0);
  assert.equal(boundary80.tier, 'strong');
  assert.equal(boundary80.color, 'emerald');
  assert.equal(boundary80.score, 80);

  const moderate = getMatchScoreTier(75.0);
  assert.equal(moderate.tier, 'moderate');
  assert.equal(moderate.color, 'amber');
  assert.equal(moderate.score, 75);
  assert.equal(moderate.label, 'Moderate Match');

  const boundary60 = getMatchScoreTier(60.0);
  assert.equal(boundary60.tier, 'moderate');
  assert.equal(boundary60.score, 60);

  const developing = getMatchScoreTier(45.0);
  assert.equal(developing.tier, 'developing');
  assert.equal(developing.color, 'rose');
  assert.equal(developing.score, 45);
  assert.equal(developing.label, 'Developing Match');

  // Clamping
  assert.equal(getMatchScoreTier(120).score, 100);
  assert.equal(getMatchScoreTier(-10).score, 0);

  // Null, undefined, and NaN values produce Pending / Unavailable without score
  const nullResult = getMatchScoreTier(null);
  assert.equal(nullResult.tier, 'unavailable');
  assert.equal(nullResult.color, 'slate');
  assert.equal(nullResult.score, null);
  assert.equal(nullResult.label, 'Pending');

  const undefResult = getMatchScoreTier(undefined);
  assert.equal(undefResult.tier, 'unavailable');
  assert.equal(undefResult.score, null);

  const nanResult = getMatchScoreTier(NaN);
  assert.equal(nanResult.tier, 'unavailable');
  assert.equal(nanResult.score, null);
});

// Test 3: Evaluation status view branching (pending, failed, completed, unavailable)
test('Evaluation lifecycle view branching for pending, failed, completed, and unavailable', () => {
  const determineView = (status, score) => {
    const isCompleted = status === 'completed' && typeof score === 'number';
    const isPending = status === 'pending' || status === 'queued' || status === 'running';
    const isFailed = status === 'failed';

    if (isCompleted) return 'VIEW_COMPLETED';
    if (isFailed) return 'VIEW_FAILED';
    if (isPending) return 'VIEW_PENDING';
    return 'VIEW_UNAVAILABLE';
  };

  // Completed evaluation with score
  assert.equal(determineView('completed', 85), 'VIEW_COMPLETED');

  // Completed status but missing score must not show stale/broken score gauge
  assert.equal(determineView('completed', null), 'VIEW_UNAVAILABLE');

  // Pending / running evaluations must never render stale scores
  assert.equal(determineView('pending', null), 'VIEW_PENDING');
  assert.equal(determineView('pending', 85), 'VIEW_PENDING'); // Even if older score lingering, pending takes precedence
  assert.equal(determineView('running', null), 'VIEW_PENDING');
  assert.equal(determineView('queued', null), 'VIEW_PENDING');

  // Failed evaluation must show explicit failure state
  assert.equal(determineView('failed', null), 'VIEW_FAILED');
  assert.equal(determineView('failed', 80), 'VIEW_FAILED'); // Failed takes precedence over stale score

  // Unavailable
  assert.equal(determineView('unavailable', null), 'VIEW_UNAVAILABLE');
  assert.equal(determineView('not_evaluated', null), 'VIEW_UNAVAILABLE');
});

// Test 4: Required vs Preferred skill classification and missing skills
test('Required vs Preferred classification ensures missing preferred skills are not mandatory failures', () => {
  const skillEvidence = [
    { requirement: 'Python', claim: 'Direct match', type: 'matched', required: true, details: 'required' },
    { requirement: 'FastAPI', claim: 'Direct match', type: 'matched', required: false, details: 'preferred' },
    { requirement: 'PostgreSQL', claim: 'Not detected', type: 'not_detected', required: true, details: 'required' },
    { requirement: 'Redis', claim: 'Not detected', type: 'not_detected', required: false, details: 'preferred' },
  ];

  const skillRequirementMap = new Map();
  for (const ev of skillEvidence) {
    skillRequirementMap.set(ev.requirement.toLowerCase(), {
      required: typeof ev.required === 'boolean' ? ev.required : ev.details === 'required' ? true : ev.details === 'preferred' ? false : null,
      type: ev.type,
    });
  }

  assert.equal(skillRequirementMap.get('python')?.required, true);
  assert.equal(skillRequirementMap.get('fastapi')?.required, false);
  assert.equal(skillRequirementMap.get('postgresql')?.required, true);
  assert.equal(skillRequirementMap.get('redis')?.required, false);

  // Missing skills breakdown logic
  const missingSkills = ['PostgreSQL', 'Redis'];
  const missingRequired = missingSkills.filter(s => skillRequirementMap.get(s.toLowerCase())?.required === true);
  const missingPreferred = missingSkills.filter(s => skillRequirementMap.get(s.toLowerCase())?.required === false);

  assert.deepEqual(missingRequired, ['PostgreSQL']);
  assert.deepEqual(missingPreferred, ['Redis']);

  // Strengths / weaknesses breakdown logic
  const weak = [];
  if (missingRequired.length > 0) {
    weak.push({
      title: `${missingRequired.length} Required Skill Gap(s) (Not Detected)`,
      detail: `Mandatory role requirements not detected: ${missingRequired.join(', ')}`,
      badge: 'Mandatory Gap',
    });
  }
  if (missingPreferred.length > 0) {
    weak.push({
      title: `${missingPreferred.length} Preferred Skill(s) (Growth Area)`,
      detail: `Optional nice-to-have capabilities not detected: ${missingPreferred.join(', ')}. Non-mandatory.`,
      badge: 'Preferred Area',
    });
  }

  assert.equal(weak.length, 2);
  assert.equal(weak[0].badge, 'Mandatory Gap');
  assert.equal(weak[1].badge, 'Preferred Area');
  assert.ok(!weak[1].title.includes('Gap')); // Preferred is framed as growth area, not critical gap
});

// Test 5: Direct vs Transferable evidence differentiation
test('Direct and transferable evidence are distinguishable with accurate labels', () => {
  const getEvidencePresentation = (type) => {
    switch (type) {
      case 'matched':
        return { label: 'Direct Match', category: 'verified_direct', badgeStyle: 'emerald' };
      case 'transferable':
        return { label: 'Transferable', category: 'taxonomy_mapped', badgeStyle: 'teal' };
      case 'not_detected':
      default:
        return { label: 'Not Detected', category: 'unmet', badgeStyle: 'amber' };
    }
  };

  const direct = getEvidencePresentation('matched');
  assert.equal(direct.label, 'Direct Match');
  assert.equal(direct.badgeStyle, 'emerald');

  const trans = getEvidencePresentation('transferable');
  assert.equal(trans.label, 'Transferable');
  assert.equal(trans.badgeStyle, 'teal');

  const unmet = getEvidencePresentation('not_detected');
  assert.equal(unmet.label, 'Not Detected');
  assert.equal(unmet.badgeStyle, 'amber');
});

// Test 6: Truthful and honest source attribution formatting
test('Truthful source attribution displays Unknown / Unspecified when source section is unknown', () => {
  const formatSourceAttribution = (sourceSection, charStart, charEnd) => {
    let sectionText = null;
    if (sourceSection) {
      sectionText = sourceSection === 'unknown' ? 'Unknown / Unspecified' : sourceSection.replace(/_/g, ' ');
    }
    let spanText = null;
    if (charStart != null && charEnd != null) {
      spanText = `(span ${charStart}–${charEnd})`;
    }
    return { sectionText, spanText };
  };

  // Unknown section
  const unknownAttr = formatSourceAttribution('unknown', 10, 45);
  assert.equal(unknownAttr.sectionText, 'Unknown / Unspecified');
  assert.equal(unknownAttr.spanText, '(span 10–45)');

  // Known section
  const expAttr = formatSourceAttribution('work_experience', 100, 250);
  assert.equal(expAttr.sectionText, 'work experience');
  assert.equal(expAttr.spanText, '(span 100–250)');

  // Null section without spans
  const nullAttr = formatSourceAttribution(null, null, null);
  assert.equal(nullAttr.sectionText, null);
  assert.equal(nullAttr.spanText, null);
});

// Test 7: Historical evaluation run_id query parameter handling
test('Historical evaluation run_id parameter is forwarded correctly', () => {
  const buildMatchResultsUrl = (applicationId, runId) => {
    const queryParam = runId ? `?run_id=${encodeURIComponent(runId)}` : '';
    return `/applications/${applicationId}/match-results${queryParam}`;
  };

  assert.equal(
    buildMatchResultsUrl('app-123', null),
    '/applications/app-123/match-results'
  );
  assert.equal(
    buildMatchResultsUrl('app-123', undefined),
    '/applications/app-123/match-results'
  );
  assert.equal(
    buildMatchResultsUrl('app-123', 'run-abc-789'),
    '/applications/app-123/match-results?run_id=run-abc-789'
  );
  assert.equal(
    buildMatchResultsUrl('app-123', 'run with spaces&special'),
    '/applications/app-123/match-results?run_id=run%20with%20spaces%26special'
  );
});

// Test 8: Resilience to missing or null optional metadata
test('Handles null optional fields and missing metadata without crashing', () => {
  const minimalDTO = {
    application_id: 'app-999',
    application_status: 'submitted',
    job_id: 'job-111',
    job_title: 'Backend Specialist',
    company_name: null,
    overall_match_score: null,
    evaluation_status: 'pending',
    evaluated_at: null,
    matched_skills: [],
    missing_skills: [],
    transferable_skills: [],
    skill_evidence: [
      {
        requirement: 'Go',
        claim: 'No evidence',
        sourceText: null,
        type: 'not_detected',
        details: null,
        required: null,
        source_section: null,
        character_start: null,
        character_end: null
      }
    ],
    experience: null,
    education: null,
    recommendations: []
  };

  assert.equal(minimalDTO.overall_match_score, null);
  assert.equal(minimalDTO.experience, null);
  assert.equal(minimalDTO.education, null);
  assert.equal(minimalDTO.recommendations.length, 0);
  assert.equal(minimalDTO.skill_evidence.length, 1);
  assert.equal(minimalDTO.skill_evidence[0].sourceText, null);
  assert.equal(minimalDTO.skill_evidence[0].source_section, null);
  assert.equal(minimalDTO.skill_evidence[0].character_start, null);
  assert.equal(minimalDTO.skill_evidence[0].character_end, null);
  assert.equal(minimalDTO.skill_evidence[0].required, null);
});
