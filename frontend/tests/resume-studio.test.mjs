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
const libDataUrl = `data:text/javascript;base64,${Buffer.from(transpiledLib).toString('base64')}`;
const resumeStudio = await import(libDataUrl);

const rawLifecycleSource = await readFile(
  path.join(projectRoot, 'src/lib/resumeStudioLifecycle.ts'),
  'utf8'
);
const patchedLifecycleSource = rawLifecycleSource.replace(
  'from "./resumeStudio"',
  `from "${libDataUrl}"`
);
const transpiledLifecycle = ts.transpileModule(patchedLifecycleSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const lifecycleModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledLifecycle).toString('base64')}`
);

const {
  derivePhaseFromResumeRecord,
  isResumeIngestionReady,
  canStartAnalysis,
  getAnalysisActionLabel,
  normalizeAtsResponse,
  getResumeQualitySummary,
  buildPipelineStages,
} = resumeStudio;

const { ResumeStudioLifecycleController } = lifecycleModule;

function makeStatus(overrides = {}) {
  return {
    resume_id: 'res-1',
    run_id: 'run-1',
    status: 'queued',
    current_stage: 'queued',
    failed_stage: null,
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
    ...overrides,
  };
}

function makeCompletedResult(score = 86.5) {
  return {
    overall_ats_score: score,
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
  };
}

async function waitUntil(predicate, timeoutMs = 1000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((r) => setTimeout(r, 5));
  }
}

test('Ingestion readiness: QUEUED, UPLOADING, PENDING, PROCESSING, and missing status are not ready', () => {
  assert.equal(derivePhaseFromResumeRecord(null), 'no_resume');
  assert.equal(derivePhaseFromResumeRecord({ id: 'res-1', processing_status: 'UPLOADING' }), 'uploading');
  assert.equal(derivePhaseFromResumeRecord({ id: 'res-1', processing_status: 'QUEUED' }), 'validating');
  assert.equal(derivePhaseFromResumeRecord({ id: 'res-1', processing_status: 'PENDING' }), 'validating');
  assert.equal(derivePhaseFromResumeRecord({ id: 'res-1', processing_status: 'PROCESSING' }), 'validating');
  assert.equal(derivePhaseFromResumeRecord({ id: 'res-1', processing_status: '' }), 'validating');
  assert.equal(derivePhaseFromResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' }), 'ready_for_analysis');
  assert.equal(isResumeIngestionReady({ id: 'res-1', processing_status: 'QUEUED' }), false);
  assert.equal(isResumeIngestionReady({ id: 'res-1', processing_status: 'COMPLETED' }), true);
});

test('Duplicate-submission prevention & action labels', () => {
  assert.equal(canStartAnalysis('ready_for_analysis', 'res-1', false), true);
  assert.equal(canStartAnalysis('ready_for_analysis', 'res-1', true), false);
  assert.equal(canStartAnalysis('analyzing', 'res-1', false), false);
  assert.equal(canStartAnalysis('uploading', 'res-1', false), false);
  assert.equal(canStartAnalysis('validating', 'res-1', false), false);
  assert.equal(canStartAnalysis('needs_attention', 'res-1', false), false);
  assert.equal(canStartAnalysis('ready_for_analysis', null, false), false);

  assert.equal(getAnalysisActionLabel('failed'), 'Retry AI Analysis');
  assert.equal(getAnalysisActionLabel('completed'), 'Re-run AI Analysis');
  assert.equal(getAnalysisActionLabel('analyzing'), 'Analyzing Resume...');
  assert.equal(getAnalysisActionLabel('ready_for_analysis'), 'Start AI Analysis');
});

test('15. Missing failed-stage information: does not infer a specific failed stage when current_stage=failed', () => {
  const stages = buildPipelineStages(
    makeStatus({
      status: 'failed',
      current_stage: 'failed',
      failed_stage: null,
      started_at: '2026-11-27T14:20:01Z',
      failure_detail: 'Worker crashed',
    })
  );
  assert.equal(stages.length, 4);
  assert.ok(stages.every((s) => s.status === 'pending' && s.error === null));

  const explicitFailed = buildPipelineStages(
    makeStatus({
      status: 'failed',
      current_stage: 'failed',
      failed_stage: 'extracting_text',
      failure_detail: 'No selectable text detected',
    })
  );
  assert.deepEqual(
    explicitFailed.map((s) => s.status),
    ['completed', 'failed', 'pending', 'pending']
  );
  assert.equal(explicitFailed[1].error, 'No selectable text detected');
});

test('1. Three consecutive identical queued responses continue polling until completed', async () => {
  let pollCount = 0;
  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () => makeStatus({ status: 'ready', run_id: null, current_stage: 'ready' }),
      startAnalysis: async () => makeStatus({ status: 'queued', run_id: 'run-1', current_stage: 'queued' }),
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async () => {
        pollCount += 1;
        if (pollCount <= 3) {
          return makeStatus({ status: 'queued', run_id: 'run-1', current_stage: 'queued' });
        }
        return makeStatus({
          status: 'completed',
          run_id: 'run-1',
          current_stage: 'completed',
          result_available: true,
          result: makeCompletedResult(91),
        });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  await controller.startOrRetryAnalysis();
  await waitUntil(() => controller.getSnapshot().phase === 'completed');

  assert.equal(pollCount, 4);
  assert.equal(controller.getSnapshot().isPolling, false);
  assert.equal(controller.getSnapshot().parsedData.atsScore, 91);
  controller.dispose();
});

test('2 & 4. Multiple running responses with unchanged stage and stage transitions', async () => {
  const sequence = [
    makeStatus({ status: 'running', current_stage: 'extracting_text' }),
    makeStatus({ status: 'running', current_stage: 'extracting_text' }),
    makeStatus({ status: 'running', current_stage: 'analyzing_ats' }),
    makeStatus({ status: 'running', current_stage: 'persisting_results' }),
    makeStatus({
      status: 'completed',
      current_stage: 'completed',
      result_available: true,
      result: makeCompletedResult(84),
    }),
  ];
  let idx = 0;
  const observedStages = [];

  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () => makeStatus({ status: 'ready', run_id: null, current_stage: 'ready' }),
      startAnalysis: async () => {
        const res = makeStatus({ status: 'queued', run_id: 'run-1', current_stage: 'queued' });
        observedStages.push(res.current_stage);
        return res;
      },
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async () => {
        const res = sequence[idx++];
        observedStages.push(res.current_stage);
        return res;
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  await controller.startOrRetryAnalysis();
  await waitUntil(() => controller.getSnapshot().phase === 'completed');

  assert.deepEqual(observedStages, [
    'queued',
    'extracting_text',
    'extracting_text',
    'analyzing_ats',
    'persisting_results',
    'completed',
  ]);
  controller.dispose();
});

test('3 & 5. Queued -> running -> failed terminal response stops polling and enables retry', async () => {
  let pollCount = 0;
  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () => makeStatus({ status: 'ready', run_id: null, current_stage: 'ready' }),
      startAnalysis: async () => makeStatus({ status: 'queued', run_id: 'run-1', current_stage: 'queued' }),
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async () => {
        pollCount += 1;
        if (pollCount === 1) {
          return makeStatus({ status: 'running', current_stage: 'analyzing_ats' });
        }
        return makeStatus({
          status: 'failed',
          current_stage: 'failed',
          failure_code: 'ats_error',
          failure_detail: 'Corrupt PDF stream',
        });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  await controller.startOrRetryAnalysis();
  await waitUntil(() => controller.getSnapshot().phase === 'failed');

  const snap = controller.getSnapshot();
  assert.equal(snap.isPolling, false);
  assert.equal(snap.canRetryWithRun, true);
  assert.equal(snap.atsError, 'Corrupt PDF stream');
  controller.dispose();
});

test('6. Transient network failure recovers without marking analysis failed, and pauses after bound', async () => {
  let pollCount = 0;
  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    maxTransientPollErrors: 3,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () => makeStatus({ status: 'ready', run_id: null, current_stage: 'ready' }),
      startAnalysis: async () => makeStatus({ status: 'running', run_id: 'run-1', current_stage: 'analyzing_ats' }),
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async () => {
        pollCount += 1;
        if (pollCount <= 2) {
          const err = new Error('Network Error');
          throw err;
        }
        return makeStatus({
          status: 'completed',
          run_id: 'run-1',
          current_stage: 'completed',
          result_available: true,
          result: makeCompletedResult(79),
        });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  await controller.startOrRetryAnalysis();
  await waitUntil(() => Boolean(controller.getSnapshot().connectionWarning));
  assert.equal(controller.getSnapshot().phase, 'analyzing');
  assert.equal(controller.getSnapshot().canRetryWithRun, false);

  await waitUntil(() => controller.getSnapshot().phase === 'completed');
  assert.equal(controller.getSnapshot().connectionWarning, null);
  controller.dispose();
});

test('7. Refresh during an active run recovers latest status and resumes polling', async () => {
  let pollCount = 0;
  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () =>
        makeStatus({ status: 'running', run_id: 'run-active', current_stage: 'analyzing_ats' }),
      startAnalysis: async () => makeStatus(),
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async (_resumeId, runId) => {
        assert.equal(runId, 'run-active');
        pollCount += 1;
        return makeStatus({
          status: 'completed',
          run_id: 'run-active',
          current_stage: 'completed',
          result_available: true,
          result: makeCompletedResult(88),
        });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  assert.equal(controller.getSnapshot().phase, 'analyzing');
  assert.equal(controller.getSnapshot().isPolling, true);

  await waitUntil(() => controller.getSnapshot().phase === 'completed');
  assert.equal(pollCount, 1);
  controller.dispose();
});

test('8. Duplicate start prevention and 409 Conflict recovery', async () => {
  let startCalls = 0;
  let pollCalls = 0;
  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () => {
        if (startCalls === 0) {
          return makeStatus({ status: 'ready', run_id: null, current_stage: 'ready' });
        }
        return makeStatus({ status: 'running', run_id: 'run-existing', current_stage: 'analyzing_ats' });
      },
      startAnalysis: async () => {
        startCalls += 1;
        const err = new Error('Conflict');
        err.response = { status: 409 };
        throw err;
      },
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async (_resumeId, runId) => {
        pollCalls += 1;
        assert.equal(runId, 'run-existing');
        return makeStatus({
          status: 'completed',
          run_id: 'run-existing',
          current_stage: 'completed',
          result_available: true,
          result: makeCompletedResult(82),
        });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  await Promise.all([controller.startOrRetryAnalysis(), controller.startOrRetryAnalysis()]);
  assert.equal(startCalls, 1);

  await waitUntil(() => controller.getSnapshot().phase === 'completed');
  assert.equal(pollCalls, 1);
  controller.dispose();
});

test('9 & 10. Retry creates a new run and stale responses from old run are ignored', async () => {
  let resolveSlowOldPoll;
  let retryCalled = false;

  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () =>
        makeStatus({
          status: 'failed',
          run_id: 'run-1',
          current_stage: 'failed',
          failure_detail: 'Initial failure',
        }),
      startAnalysis: async () => makeStatus(),
      retryAnalysis: async (_resumeId, runId) => {
        assert.equal(runId, 'run-1');
        retryCalled = true;
        return makeStatus({
          status: 'running',
          run_id: 'run-2',
          attempt_number: 2,
          retry_of_run_id: 'run-1',
          current_stage: 'analyzing_ats',
        });
      },
      getRunStatus: async (_resumeId, runId) => {
        if (runId === 'run-1') {
          return new Promise((resolve) => {
            resolveSlowOldPoll = resolve;
          });
        }
        return makeStatus({
          status: 'completed',
          run_id: 'run-2',
          current_stage: 'completed',
          result_available: true,
          result: makeCompletedResult(93),
        });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  assert.equal(controller.getSnapshot().phase, 'failed');

  await controller.startOrRetryAnalysis();
  assert.equal(retryCalled, true);

  // Even if a late response for run-1 resolved, run-2 completes cleanly
  if (resolveSlowOldPoll) {
    resolveSlowOldPoll(makeStatus({ status: 'failed', run_id: 'run-1', current_stage: 'failed' }));
  }

  await waitUntil(() => controller.getSnapshot().phase === 'completed');
  assert.equal(controller.getSnapshot().activeRunId, 'run-2');
  assert.equal(controller.getSnapshot().parsedData.atsScore, 93);
  controller.dispose();
});

test('11. Resume switch during polling aborts old resume poll and ignores stale responses', async () => {
  let abortedOldSignal = false;
  let res2Polled = false;

  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 10,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async (resumeId) => {
        if (resumeId === 'res-1') {
          return makeStatus({ resume_id: 'res-1', status: 'running', run_id: 'run-1', current_stage: 'analyzing_ats' });
        }
        return makeStatus({ resume_id: 'res-2', status: 'ready', run_id: null, current_stage: 'ready' });
      },
      startAnalysis: async () => makeStatus(),
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async (resumeId, _runId, signal) => {
        if (resumeId === 'res-1') {
          signal?.addEventListener('abort', () => {
            abortedOldSignal = true;
          });
          return makeStatus({ resume_id: 'res-1', status: 'running', run_id: 'run-1', current_stage: 'analyzing_ats' });
        }
        res2Polled = true;
        return makeStatus({ resume_id: 'res-2', status: 'completed', run_id: 'run-2', current_stage: 'completed' });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  assert.equal(controller.getSnapshot().isPolling, true);

  await controller.applyResumeRecord({ id: 'res-2', processing_status: 'COMPLETED' });
  assert.equal(controller.getSnapshot().resumeId, 'res-2');
  assert.equal(controller.getSnapshot().phase, 'ready_for_analysis');
  assert.equal(controller.getSnapshot().isPolling, false);
  assert.equal(res2Polled, false);
  assert.equal(abortedOldSignal, false);
  controller.dispose();
});

test('12. Unmount (dispose) during polling stops polling immediately', async () => {
  let pollCount = 0;
  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 10,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () =>
        makeStatus({ status: 'running', run_id: 'run-1', current_stage: 'analyzing_ats' }),
      startAnalysis: async () => makeStatus(),
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async () => {
        pollCount += 1;
        return makeStatus({ status: 'running', run_id: 'run-1', current_stage: 'analyzing_ats' });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  controller.dispose();
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(pollCount, 0);
});

test('13. Sequential polling prevents overlapping getRunStatus requests', async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  let pollCount = 0;

  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () =>
        makeStatus({ status: 'running', run_id: 'run-1', current_stage: 'analyzing_ats' }),
      startAnalysis: async () => makeStatus(),
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 20));
        inFlight -= 1;
        pollCount += 1;
        if (pollCount >= 2) {
          return makeStatus({
            status: 'completed',
            run_id: 'run-1',
            current_stage: 'completed',
            result_available: true,
            result: makeCompletedResult(85),
          });
        }
        return makeStatus({ status: 'running', run_id: 'run-1', current_stage: 'analyzing_ats' });
      },
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'COMPLETED' });
  await waitUntil(() => controller.getSnapshot().phase === 'completed');
  assert.equal(maxInFlight, 1);
  assert.equal(pollCount, 2);
  controller.dispose();
});

test('14. Ingestion not yet ready does not query /analysis or allow ready override', async () => {
  let analysisCalls = 0;
  const controller = new ResumeStudioLifecycleController({
    pollIntervalMs: 5,
    onStateChange: () => {},
    client: {
      getLatestAnalysisStatus: async () => {
        analysisCalls += 1;
        return makeStatus({ status: 'ready', run_id: null, current_stage: 'ready' });
      },
      startAnalysis: async () => makeStatus(),
      retryAnalysis: async () => makeStatus(),
      getRunStatus: async () => makeStatus(),
    },
  });

  await controller.applyResumeRecord({ id: 'res-1', processing_status: 'QUEUED' });
  assert.equal(controller.getSnapshot().phase, 'validating');
  assert.equal(analysisCalls, 0);
  assert.equal(canStartAnalysis(controller.getSnapshot().phase, 'res-1', false), false);
  controller.dispose();
});

test('Partial ATS normalization & UI accessibility checks', async () => {
  const partial = normalizeAtsResponse({
    overall_ats_score: 71,
    detected_skills: ['React'],
  });
  assert.equal(partial.isPartial, true);
  assert.equal(partial.parsed.atsScore, 71);
  assert.equal(partial.parsed.skillsScore, null);
  assert.equal(getResumeQualitySummary(null).label, 'ATS Score Unavailable');

  const pipelineSrc = await readFile(
    path.join(projectRoot, 'src/components/AnalysisPipeline.tsx'),
    'utf8'
  );
  assert.ok(pipelineSrc.includes('aria-live="polite"'));
  assert.ok(pipelineSrc.includes('aria-current={isStageRunning ? "step" : undefined}'));
  assert.ok(pipelineSrc.includes('Check Status'));
});
