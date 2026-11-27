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
  buildPipelineStages,
  mapAnalysisStatusToStudioState,
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

test('Backend stage transitions: ready, queued, running stages, completed, and failed', () => {
  const base = {
    resume_id: 'res-1',
    run_id: 'run-1',
    attempt_number: 1,
    retry_of_run_id: null,
    result_available: false,
    failure_code: null,
    failure_detail: null,
    result: null,
    created_at: '2026-11-27T14:20:00Z',
    started_at: null,
    completed_at: null,
    failed_at: null,
  };

  const readyStages = buildPipelineStages({ ...base, run_id: null, status: 'ready', current_stage: 'ready' });
  assert.equal(readyStages.length, 4);
  assert.ok(readyStages.every((s) => s.status === 'pending'));

  const queuedStages = buildPipelineStages({ ...base, status: 'queued', current_stage: 'queued' });
  assert.deepEqual(
    queuedStages.map((s) => s.status),
    ['running', 'pending', 'pending', 'pending']
  );

  const analyzingStages = buildPipelineStages({
    ...base,
    status: 'running',
    current_stage: 'analyzing_ats',
    started_at: '2026-11-27T14:20:00Z',
  });
  assert.deepEqual(
    analyzingStages.map((s) => s.status),
    ['completed', 'completed', 'running', 'pending']
  );

  const completedStages = buildPipelineStages({
    ...base,
    status: 'completed',
    current_stage: 'completed',
    result_available: true,
  });
  assert.ok(completedStages.every((s) => s.status === 'completed'));

  const failedStages = buildPipelineStages({
    ...base,
    status: 'failed',
    current_stage: 'extracting_text',
    failure_code: 'scanned_document',
    failure_detail: 'No selectable text detected',
  });
  assert.deepEqual(
    failedStages.map((s) => s.status),
    ['completed', 'failed', 'pending', 'pending']
  );
  assert.equal(failedStages[1].error, 'No selectable text detected');
});

test('mapAnalysisStatusToStudioState handles refresh recovery, polling, completion, and failure', () => {
  const base = {
    resume_id: 'res-1',
    run_id: 'run-1',
    attempt_number: 1,
    retry_of_run_id: null,
    result_available: false,
    failure_code: null,
    failure_detail: null,
    result: null,
    created_at: '2026-11-27T14:20:00Z',
    started_at: null,
    completed_at: null,
    failed_at: null,
  };

  const runningState = mapAnalysisStatusToStudioState({
    ...base,
    status: 'running',
    current_stage: 'analyzing_ats',
  });
  assert.equal(runningState.phase, 'analyzing');
  assert.equal(runningState.shouldPoll, true);

  const completedState = mapAnalysisStatusToStudioState({
    ...base,
    status: 'completed',
    current_stage: 'completed',
    result_available: true,
    result: {
      overall_ats_score: 86.5,
      grade: 'B',
      section_score: 90,
      contact_score: 100,
      impact_score: 75,
      formatting_score: 100,
      skills_score: 62.5,
      detected_skills: ['Docker', 'FastAPI'],
      detected_sections: { experience: true },
      missing_critical_sections: [],
      action_verbs_found: ['built'],
      quantifiable_metrics_count: 2,
      word_count: 100,
      strengths: ['Good'],
      issues: [],
    },
  });
  assert.equal(completedState.phase, 'completed');
  assert.equal(completedState.shouldPoll, false);
  assert.equal(completedState.parsed.atsScore, 87);

  const failedState = mapAnalysisStatusToStudioState({
    ...base,
    status: 'failed',
    current_stage: 'failed',
    failure_code: 'parse_failed',
    failure_detail: 'Corrupt PDF stream',
  });
  assert.equal(failedState.phase, 'failed');
  assert.equal(failedState.shouldPoll, false);
  assert.equal(failedState.errorMessage, 'Corrupt PDF stream');
});

test('Completion and partial normalization preserve truthful null fields', () => {
  const partial = normalizeAtsResponse({
    overall_ats_score: 71,
    detected_skills: ['React'],
  });

  assert.equal(partial.isPartial, true);
  assert.equal(partial.parsed.atsScore, 71);
  assert.equal(partial.parsed.skillsScore, null);
  assert.equal(partial.parsed.formattingScore, null);
  assert.equal(getResumeQualitySummary(null).label, 'ATS Score Unavailable');
});

test('Source checks: wired to confirmed lifecycle contract with 409 recovery and no fake timers', async () => {
  const pageSrc = await readFile(
    path.join(projectRoot, 'src/app/dashboard/resume/page.tsx'),
    'utf8'
  );
  assert.equal(pageSrc.includes('setInterval'), false);
  assert.ok(pageSrc.includes('/resumes/${resumeId}/analysis'));
  assert.ok(pageSrc.includes('/resumes/${uploadedResumeId}/analysis/${activeRunId}'));
  assert.ok(pageSrc.includes('/resumes/${uploadedResumeId}/analysis/${activeRunId}/retry'));
  assert.ok(pageSrc.includes('statusCode === 409'));
  assert.ok(pageSrc.includes('AnalysisPipeline'));
  assert.ok(pageSrc.includes('ResumeStudioResults'));

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
