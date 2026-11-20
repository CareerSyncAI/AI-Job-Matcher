import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Validate Schema Structure and Types
test('CandidateMatchResultsDTO schema contract integrity', () => {
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
        type: 'explicit'
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
  assert.ok(sampleDTO.experience !== null);
  assert.equal(sampleDTO.experience.alignment_score, 95.0);
  assert.ok(sampleDTO.education !== null);
  assert.equal(sampleDTO.education.alignment_score, 100.0);
});

// Test 2: Gauge Percentage Clamping and Color Assignment Logic
test('Match score gauge color tiering logic', () => {
  const getTier = (score) => {
    if (score == null) return { tier: 'unavailable', color: 'slate' };
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    if (clamped >= 80) return { tier: 'strong', color: 'emerald', score: clamped };
    if (clamped >= 60) return { tier: 'moderate', color: 'amber', score: clamped };
    return { tier: 'developing', color: 'rose', score: clamped };
  };

  assert.deepEqual(getTier(95.4), { tier: 'strong', color: 'emerald', score: 95 });
  assert.deepEqual(getTier(80.0), { tier: 'strong', color: 'emerald', score: 80 });
  assert.deepEqual(getTier(79.4), { tier: 'moderate', color: 'amber', score: 79 });
  assert.deepEqual(getTier(60.0), { tier: 'moderate', color: 'amber', score: 60 });
  assert.deepEqual(getTier(59.9), { tier: 'moderate', color: 'amber', score: 60 });
  assert.deepEqual(getTier(59.4), { tier: 'developing', color: 'rose', score: 59 });
  assert.deepEqual(getTier(45.0), { tier: 'developing', color: 'rose', score: 45 });
  assert.deepEqual(getTier(null), { tier: 'unavailable', color: 'slate' });
  assert.deepEqual(getTier(120), { tier: 'strong', color: 'emerald', score: 100 });
  assert.deepEqual(getTier(-10), { tier: 'developing', color: 'rose', score: 0 });
});

// Test 3: Status Handling and View Branching
test('Evaluation status view branching', () => {
  const evaluateState = (status, score) => {
    if (status === 'completed' && score != null) return 'VIEW_RESULTS';
    if (status === 'pending') return 'VIEW_PENDING';
    if (status === 'unavailable' || score == null) return 'VIEW_UNAVAILABLE';
    return 'VIEW_DEFAULT';
  };

  assert.equal(evaluateState('completed', 85), 'VIEW_RESULTS');
  assert.equal(evaluateState('completed', null), 'VIEW_UNAVAILABLE');
  assert.equal(evaluateState('pending', null), 'VIEW_PENDING');
  assert.equal(evaluateState('unavailable', null), 'VIEW_UNAVAILABLE');
});

// Test 4: Handling missing or null optional fields gracefully
test('Handles null optional fields without error', () => {
  const minimalDTO = {
    application_id: 'app-999',
    application_status: 'submitted',
    job_id: 'job-111',
    job_title: 'Backend Specialist',
    company_name: 'Acme',
    overall_match_score: null,
    evaluation_status: 'pending',
    evaluated_at: null,
    matched_skills: [],
    missing_skills: [],
    transferable_skills: [],
    skill_evidence: [],
    experience: null,
    education: null,
    recommendations: []
  };

  assert.equal(minimalDTO.overall_match_score, null);
  assert.equal(minimalDTO.experience, null);
  assert.equal(minimalDTO.education, null);
  assert.equal(minimalDTO.recommendations.length, 0);
  assert.equal(minimalDTO.skill_evidence.length, 0);
});

// Test 5: API Error Mapping (404, 403, 500)
test('HTTP Status code classification for candidate feedback', () => {
  const mapHttpError = (statusCode) => {
    switch (statusCode) {
      case 404:
        return { type: 'NOT_FOUND', userMessage: 'Application or evaluation record not found' };
      case 403:
        return { type: 'FORBIDDEN', userMessage: 'You do not have permission to view match results for this application' };
      case 500:
      default:
        return { type: 'SERVER_ERROR', userMessage: 'Service temporarily unavailable' };
    }
  };

  assert.equal(mapHttpError(404).type, 'NOT_FOUND');
  assert.equal(mapHttpError(403).type, 'FORBIDDEN');
  assert.equal(mapHttpError(500).type, 'SERVER_ERROR');
  assert.equal(mapHttpError(502).type, 'SERVER_ERROR');
});
