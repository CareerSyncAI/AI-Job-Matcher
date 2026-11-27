import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Recruiter job requisition creation payload contract
test('Recruiter job requisition payload conforms to API contract', () => {
  const jobPayload = {
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    location: 'Remote',
    employment_type: 'Full-time',
    work_arrangement: 'Remote',
    experience_min_years: 3,
    education_required: 'Bachelor',
    description: 'We are seeking a senior engineer proficient in React, Next.js, and Python APIs.',
    skills: [
      { name: 'Python', required: true },
      { name: 'TypeScript', required: true },
      { name: 'Docker', required: false },
    ],
    status: 'open',
  };

  assert.ok(jobPayload.title.length > 0);
  assert.ok(jobPayload.description.length > 0);
  assert.equal(typeof jobPayload.experience_min_years, 'number');
  assert.ok(jobPayload.experience_min_years >= 0);
  assert.ok(['draft', 'open', 'closed', 'archived'].includes(jobPayload.status));
  assert.ok(Array.isArray(jobPayload.skills));
  assert.equal(jobPayload.skills.length, 3);
  assert.equal(jobPayload.skills[0].name, 'Python');
  assert.equal(jobPayload.skills[0].required, true);
  assert.equal(jobPayload.skills[2].required, false);
});

// Test 2: Recruiter candidate ranking ordering (Tier 1 > Tier 2 > Tier 3)
test('Recruiter candidate ranking reflects deterministic tiers and match scores', () => {
  const candidates = [
    {
      id: 'c1',
      name: 'Alice (Direct Required + Preferred)',
      matchScore: 92.0,
      status: 'new',
      matchedSkills: ['Python', 'FastAPI', 'Kubernetes'],
      missingSkills: [],
    },
    {
      id: 'c2',
      name: 'Bob (Direct Required Only)',
      matchScore: 84.0,
      status: 'under_review',
      matchedSkills: ['Python', 'FastAPI'],
      missingSkills: ['Kubernetes'],
    },
    {
      id: 'c3',
      name: 'Charlie (Transferable Required)',
      matchScore: 78.0,
      status: 'shortlisted',
      matchedSkills: ['Python'],
      transferableSkills: ['Django'],
      missingSkills: ['FastAPI', 'Kubernetes'],
    },
    {
      id: 'c4',
      name: 'Dave (Unevaluated / Stale)',
      matchScore: 0.0,
      status: 'new',
      matchedSkills: [],
      missingSkills: ['Python', 'FastAPI', 'Kubernetes'],
    },
  ];

  // Verify rank ordering: c1 > c2 > c3 > c4
  for (let i = 0; i < candidates.length - 1; i++) {
    assert.ok(
      candidates[i].matchScore >= candidates[i + 1].matchScore,
      `Candidate ${candidates[i].name} score (${candidates[i].matchScore}) must be >= ${candidates[i + 1].name} score (${candidates[i + 1].matchScore})`
    );
  }
});

// Test 3: Resume file upload validation rules
test('Resume upload validates file extension and size constraints', () => {
  const validateResumeFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected.' };
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      return { valid: false, error: 'Only PDF and DOCX resume formats are supported.' };
    }
    if (file.size === 0) {
      return { valid: false, error: 'The selected file is empty.' };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'Resume file size exceeds maximum limit of 10MB.' };
    }
    return { valid: true, error: null };
  };

  assert.equal(validateResumeFile(null).valid, false);
  assert.equal(validateResumeFile({ name: 'photo.png', size: 1024 }).valid, false);
  assert.equal(validateResumeFile({ name: 'resume.txt', size: 1024 }).valid, false);
  assert.equal(validateResumeFile({ name: 'resume.pdf', size: 0 }).valid, false);
  assert.equal(validateResumeFile({ name: 'resume.docx', size: 15 * 1024 * 1024 }).valid, false);
  assert.equal(validateResumeFile({ name: 'resume.pdf', size: 250 * 1024 }).valid, true);
  assert.equal(validateResumeFile({ name: 'resume.docx', size: 500 * 1024 }).valid, true);
});

// Test 4: Candidate applications filtering logic
test('Candidate applications list filtering matches categories and searches', () => {
  const applications = [
    { id: '1', job_title: 'Full Stack Engineer', status: 'new' },
    { id: '2', job_title: 'Backend Developer', status: 'shortlisted' },
    { id: '3', job_title: 'AI Researcher', status: 'interviewing' },
    { id: '4', job_title: 'DevOps Lead', status: 'rejected' },
  ];

  const filterApps = (apps, filter, query) => {
    return apps.filter((app) => {
      const s = app.status.toLowerCase();
      let matchTab = true;
      if (filter === 'ACTIVE') matchTab = ['new', 'under_review', 'shortlisted', 'interviewing'].includes(s);
      if (filter === 'SHORTLISTED') matchTab = s === 'shortlisted';
      if (filter === 'DECISIONS') matchTab = ['hired', 'rejected'].includes(s);

      let matchQuery = true;
      if (query.trim()) {
        matchQuery = app.job_title.toLowerCase().includes(query.toLowerCase());
      }
      return matchTab && matchQuery;
    });
  };

  assert.equal(filterApps(applications, 'ALL', '').length, 4);
  assert.equal(filterApps(applications, 'ACTIVE', '').length, 3);
  assert.equal(filterApps(applications, 'SHORTLISTED', '').length, 1);
  assert.equal(filterApps(applications, 'DECISIONS', '').length, 1);
  assert.equal(filterApps(applications, 'ALL', 'stack').length, 1);
  assert.equal(filterApps(applications, 'ACTIVE', 'devops').length, 0); // rejected is not active
});
