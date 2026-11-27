import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const rawLibSource = await readFile(path.join(projectRoot, 'src/lib/resumeStudio.ts'), 'utf8');
const transpiledLib = ts.transpileModule(rawLibSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const resumeStudio = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledLib).toString('base64')}`
);

const {
  derivePhaseFromResumeRecord,
  canStartAnalysis,
  getAnalysisActionLabel,
  normalizeAtsResponse,
  getResumeQualitySummary,
} = resumeStudio;

test('Explicit initiation: uploaded/validated resume enters ready_for_analysis, not analyzing', () => {
  assert.equal(derivePhaseFromResumeRecord(null), 'no_resume');
  assert.equal(
    derivePhaseFromResumeRecord({ id: 'res-1', processing_status: 'PENDING' }),
    'validating'
  );
  assert.equal(
    derivePhaseFromResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' }),
    'ready_for_analysis'
  );
  assert.equal(
    derivePhaseFromResumeRecord({ id: 'res-1', processing_status: 'NEEDS_ATTENTION' }),
    'needs_attention'
  );
});

test('Duplicate-submission prevention: blocks concurrent or unready analysis starts', () => {
  assert.equal(canStartAnalysis('ready_for_analysis', 'res-1', false), true);
  assert.equal(canStartAnalysis('ready_for_analysis', 'res-1', true), false);
  assert.equal(canStartAnalysis('analyzing', 'res-1', false), false);
  assert.equal(canStartAnalysis('uploading', 'res-1', false), false);
  assert.equal(canStartAnalysis('validating', 'res-1', false), false);
  assert.equal(canStartAnalysis('needs_attention', 'res-1', false), false);
  assert.equal(canStartAnalysis('ready_for_analysis', null, false), false);
});

test('Failure, retry, and re-analysis transitions and action labels', () => {
  assert.equal(canStartAnalysis('failed', 'res-1', false), true);
  assert.equal(getAnalysisActionLabel('failed'), 'Retry AI Analysis');

  assert.equal(canStartAnalysis('completed', 'res-1', false), true);
  assert.equal(getAnalysisActionLabel('completed'), 'Re-run AI Analysis');

  assert.equal(canStartAnalysis('partial', 'res-1', false), true);
  assert.equal(getAnalysisActionLabel('partial'), 'Re-run AI Analysis');

  assert.equal(getAnalysisActionLabel('analyzing'), 'Analyzing Resume...');
  assert.equal(getAnalysisActionLabel('ready_for_analysis'), 'Start AI Analysis');
});

test('Completion and partial normalization preserve truthful null fields', () => {
  const full = normalizeAtsResponse({
    overall_ats_score: 84.6,
    grade: 'B',
    section_score: 90,
    contact_score: 95,
    impact_score: 78,
    formatting_score: 88,
    skills_score: 82,
    detected_skills: ['Python', 'FastAPI', 'Kubernetes'],
    detected_sections: { experience: true, education: true, skills: true },
    missing_critical_sections: [],
    action_verbs_found: ['built', 'deployed'],
    quantifiable_metrics_count: 3,
    word_count: 450,
    strengths: ['Clear structure'],
    issues: [
      {
        category: 'impact',
        severity: 'warning',
        issue: 'Add more metrics',
        recommendation: 'Quantify outcomes',
      },
    ],
  });

  assert.equal(full.isPartial, false);
  assert.equal(full.parsed.atsScore, 85);
  assert.deepEqual(full.parsed.skills, ['Python', 'FastAPI', 'Kubernetes']);
  assert.equal(full.parsed.issues.length, 1);

  const partial = normalizeAtsResponse({
    overall_ats_score: 71,
    detected_skills: ['React'],
  });

  assert.equal(partial.isPartial, true);
  assert.equal(partial.parsed.atsScore, 71);
  assert.equal(partial.parsed.skillsScore, null);
  assert.equal(partial.parsed.formattingScore, null);
});

test('Resume quality summary distinguishes quality bands truthfully', () => {
  assert.equal(getResumeQualitySummary(null).label, 'ATS Score Unavailable');
  assert.equal(getResumeQualitySummary(90).tone, 'emerald');
  assert.equal(getResumeQualitySummary(75).tone, 'amber');
  assert.equal(getResumeQualitySummary(55).tone, 'rose');
});

test('Source checks: no fake setInterval progress and no auto-ATS on mount/upload', async () => {
  const pageSrc = await readFile(
    path.join(projectRoot, 'src/app/dashboard/resume/page.tsx'),
    'utf8'
  );
  assert.equal(pageSrc.includes('setInterval'), false);
  assert.ok(pageSrc.includes('AnalysisPipeline'));
  assert.ok(pageSrc.includes('ResumeStudioResults'));
  assert.ok(pageSrc.includes('analysisInFlightRef'));

  const pipelineSrc = await readFile(
    path.join(projectRoot, 'src/components/AnalysisPipeline.tsx'),
    'utf8'
  );
  assert.ok(pipelineSrc.includes('aria-live="polite"'));
  assert.ok(pipelineSrc.includes('aria-current={isStageRunning ? "step" : undefined}'));

  const resultsSrc = await readFile(
    path.join(projectRoot, 'src/components/ResumeStudioResults.tsx'),
    'utf8'
  );
  assert.ok(resultsSrc.includes('Resume Quality vs. Job Suitability'));
  assert.ok(resultsSrc.includes('/dashboard/jobs'));
  assert.ok(resultsSrc.includes('/dashboard/applications'));
});
