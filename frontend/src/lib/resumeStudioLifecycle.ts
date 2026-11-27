import {
  ParsedResumeData,
  ResumeAnalysisStatusResponse,
  ResumeRecordSummary,
  ResumeStudioPhase,
  classifyApiError,
  derivePhaseFromResumeRecord,
  mapAnalysisStatusToStudioState,
} from "./resumeStudio";

export interface ResumeStudioApiClient {
  getLatestAnalysisStatus(
    resumeId: string,
    signal?: AbortSignal
  ): Promise<ResumeAnalysisStatusResponse>;
  getRunStatus(
    resumeId: string,
    runId: string,
    signal?: AbortSignal
  ): Promise<ResumeAnalysisStatusResponse>;
  startAnalysis(
    resumeId: string,
    signal?: AbortSignal
  ): Promise<ResumeAnalysisStatusResponse>;
  retryAnalysis(
    resumeId: string,
    runId: string,
    signal?: AbortSignal
  ): Promise<ResumeAnalysisStatusResponse>;
}

export interface ResumeStudioLifecycleSnapshot {
  resumeId: string | null;
  phase: ResumeStudioPhase;
  analysisStatus: ResumeAnalysisStatusResponse | null;
  activeRunId: string | null;
  isPolling: boolean;
  isConnectionPaused: boolean;
  connectionWarning: string | null;
  canRetryWithRun: boolean;
  atsError: string | null;
  parsedData: ParsedResumeData | null;
}

export interface ResumeStudioLifecycleOptions {
  client: ResumeStudioApiClient;
  pollIntervalMs?: number;
  maxTransientPollErrors?: number;
  getErrorMessage?: (err: unknown, fallback: string) => string;
  onStateChange: (snapshot: ResumeStudioLifecycleSnapshot) => void;
}

function sleepWithAbort(ms: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const timerId = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, ms);

    const onAbort = () => {
      clearTimeout(timerId);
      signal.removeEventListener("abort", onAbort);
      resolve(false);
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export class ResumeStudioLifecycleController {
  private readonly client: ResumeStudioApiClient;
  private readonly pollIntervalMs: number;
  private readonly maxTransientPollErrors: number;
  private readonly getErrorMessage: (err: unknown, fallback: string) => string;
  private readonly onStateChange: (snapshot: ResumeStudioLifecycleSnapshot) => void;

  private disposed = false;
  private resumeGeneration = 0;
  private pollGeneration = 0;
  private actionGeneration = 0;
  private inFlightAction = false;
  private activePollAbort: AbortController | null = null;
  private activeRequestAbort: AbortController | null = null;

  private snapshot: ResumeStudioLifecycleSnapshot = {
    resumeId: null,
    phase: "loading",
    analysisStatus: null,
    activeRunId: null,
    isPolling: false,
    isConnectionPaused: false,
    connectionWarning: null,
    canRetryWithRun: false,
    atsError: null,
    parsedData: null,
  };

  constructor(options: ResumeStudioLifecycleOptions) {
    this.client = options.client;
    this.pollIntervalMs = options.pollIntervalMs ?? 1600;
    this.maxTransientPollErrors = options.maxTransientPollErrors ?? 5;
    this.getErrorMessage =
      options.getErrorMessage ??
      ((err, fallback) =>
        (err as { message?: string })?.message || fallback);
    this.onStateChange = options.onStateChange;
  }

  public getSnapshot(): ResumeStudioLifecycleSnapshot {
    return { ...this.snapshot };
  }

  public isActionInFlight(): boolean {
    return this.inFlightAction;
  }

  public dispose(): void {
    this.disposed = true;
    this.stopPolling();
    this.abortActiveRequest();
  }

  private emit(patch: Partial<ResumeStudioLifecycleSnapshot>): void {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.onStateChange(this.getSnapshot());
  }

  private stopPolling(): void {
    this.pollGeneration += 1;
    if (this.activePollAbort) {
      this.activePollAbort.abort();
      this.activePollAbort = null;
    }
    if (this.snapshot.isPolling) {
      this.snapshot = { ...this.snapshot, isPolling: false };
    }
  }

  private abortActiveRequest(): void {
    this.actionGeneration += 1;
    if (this.activeRequestAbort) {
      this.activeRequestAbort.abort();
      this.activeRequestAbort = null;
    }
  }

  private createRequestSignal(): AbortSignal {
    this.abortActiveRequest();
    this.activeRequestAbort = new AbortController();
    return this.activeRequestAbort.signal;
  }

  private isCurrentResume(resumeId: string, resumeGen: number): boolean {
    return (
      !this.disposed &&
      this.resumeGeneration === resumeGen &&
      this.snapshot.resumeId === resumeId
    );
  }

  private isCurrentPoll(
    resumeId: string,
    runId: string,
    resumeGen: number,
    pollGen: number
  ): boolean {
    return (
      this.isCurrentResume(resumeId, resumeGen) &&
      this.pollGeneration === pollGen &&
      this.snapshot.activeRunId === runId
    );
  }

  private applyAnalysisPayload(
    resumeId: string,
    resumeGen: number,
    payload: ResumeAnalysisStatusResponse
  ): void {
    if (!this.isCurrentResume(resumeId, resumeGen)) {
      return;
    }

    const mapped = mapAnalysisStatusToStudioState(payload);
    const runId = payload.run_id ?? null;
    const isTerminalFailed = payload.status === "failed" && Boolean(runId);

    this.emit({
      analysisStatus: payload,
      activeRunId: runId,
      phase: mapped.phase,
      parsedData: mapped.parsed,
      atsError: mapped.errorMessage,
      isPolling: mapped.shouldPoll,
      isConnectionPaused: false,
      connectionWarning: null,
      canRetryWithRun: isTerminalFailed,
    });

    if (mapped.shouldPoll && runId) {
      this.startPolling(resumeId, runId, resumeGen);
    } else {
      this.stopPolling();
    }
  }

  private startPolling(
    resumeId: string,
    runId: string,
    resumeGen: number
  ): void {
    this.stopPolling();
    const pollGen = this.pollGeneration;
    const controller = new AbortController();
    this.activePollAbort = controller;

    this.emit({ isPolling: true, isConnectionPaused: false });
    void this.runPollLoop(resumeId, runId, resumeGen, pollGen, controller.signal);
  }

  private async runPollLoop(
    resumeId: string,
    runId: string,
    resumeGen: number,
    pollGen: number,
    signal: AbortSignal
  ): Promise<void> {
    let consecutiveTransientErrors = 0;

    while (this.isCurrentPoll(resumeId, runId, resumeGen, pollGen)) {
      const delayMs =
        consecutiveTransientErrors > 0
          ? this.pollIntervalMs * Math.min(consecutiveTransientErrors, 2)
          : this.pollIntervalMs;

      const continued = await sleepWithAbort(delayMs, signal);
      if (!continued || !this.isCurrentPoll(resumeId, runId, resumeGen, pollGen)) {
        return;
      }

      try {
        const res = await this.client.getRunStatus(resumeId, runId, signal);
        if (!this.isCurrentPoll(resumeId, runId, resumeGen, pollGen)) {
          return;
        }

        consecutiveTransientErrors = 0;
        const mapped = mapAnalysisStatusToStudioState(res);

        if (mapped.shouldPoll) {
          this.emit({
            analysisStatus: res,
            activeRunId: res.run_id ?? runId,
            phase: mapped.phase,
            parsedData: mapped.parsed,
            atsError: null,
            isPolling: true,
            isConnectionPaused: false,
            connectionWarning: null,
            canRetryWithRun: false,
          });
          continue;
        }

        // Terminal status reached (completed or failed)
        this.emit({
          analysisStatus: res,
          activeRunId: res.run_id ?? runId,
          phase: mapped.phase,
          parsedData: mapped.parsed,
          atsError: mapped.errorMessage,
          isPolling: false,
          isConnectionPaused: false,
          connectionWarning: null,
          canRetryWithRun: res.status === "failed" && Boolean(res.run_id ?? runId),
        });
        return;
      } catch (err: unknown) {
        if (!this.isCurrentPoll(resumeId, runId, resumeGen, pollGen)) {
          return;
        }

        const classified = classifyApiError(err);
        if (classified.kind === "canceled") {
          return;
        }

        if (classified.kind === "auth" || classified.kind === "not_found") {
          const fallbackMsg =
            classified.kind === "auth"
              ? "Session expired or unauthorized while checking analysis status."
              : "The analysis run or resume could not be found.";
          this.emit({
            isPolling: false,
            isConnectionPaused: false,
            connectionWarning: null,
            canRetryWithRun: false,
            phase: "failed",
            atsError: this.getErrorMessage(err, fallbackMsg),
          });
          return;
        }

        if (classified.kind === "transient") {
          consecutiveTransientErrors += 1;
          if (consecutiveTransientErrors <= this.maxTransientPollErrors) {
            this.emit({
              isPolling: true,
              isConnectionPaused: false,
              canRetryWithRun: false,
              connectionWarning:
                "Temporary connection issue while checking analysis status. Retrying...",
            });
            continue;
          }

          this.emit({
            isPolling: false,
            isConnectionPaused: true,
            canRetryWithRun: false,
            connectionWarning:
              "Connection lost while checking analysis status. Your analysis may still be running on the server.",
            atsError: null,
          });
          return;
        }

        this.emit({
          isPolling: false,
          isConnectionPaused: false,
          connectionWarning: null,
          canRetryWithRun: false,
          phase: "failed",
          atsError: this.getErrorMessage(
            err,
            "Unable to retrieve AI analysis status."
          ),
        });
        return;
      }
    }
  }

  public setUploading(): void {
    this.resumeGeneration += 1;
    this.stopPolling();
    this.abortActiveRequest();
    this.inFlightAction = false;
    this.emit({
      phase: "uploading",
      atsError: null,
      connectionWarning: null,
      isConnectionPaused: false,
      canRetryWithRun: false,
      parsedData: null,
    });
  }

  public setLoading(): void {
    this.stopPolling();
    this.abortActiveRequest();
    this.emit({
      phase: "loading",
      atsError: null,
      connectionWarning: null,
      isConnectionPaused: false,
    });
  }

  public async applyResumeRecord(
    latest: ResumeRecordSummary | null
  ): Promise<void> {
    this.resumeGeneration += 1;
    const resumeGen = this.resumeGeneration;
    this.stopPolling();
    this.abortActiveRequest();
    this.inFlightAction = false;

    if (!latest || !latest.id) {
      this.emit({
        resumeId: null,
        analysisStatus: null,
        activeRunId: null,
        isPolling: false,
        isConnectionPaused: false,
        connectionWarning: null,
        canRetryWithRun: false,
        phase: "no_resume",
        atsError: null,
        parsedData: null,
      });
      return;
    }

    const resumeId = latest.id;
    const recordPhase = derivePhaseFromResumeRecord(latest);

    if (recordPhase === "needs_attention") {
      this.emit({
        resumeId,
        analysisStatus: null,
        activeRunId: null,
        isPolling: false,
        isConnectionPaused: false,
        connectionWarning: null,
        canRetryWithRun: false,
        phase: "needs_attention",
        parsedData: null,
        atsError: `Resume processing requires attention (${
          latest.needs_attention_reason || "unreadable or corrupted document"
        }). Please upload a clean PDF or DOCX.`,
      });
      return;
    }

    if (recordPhase === "uploading" || recordPhase === "validating") {
      this.emit({
        resumeId,
        analysisStatus: null,
        activeRunId: null,
        isPolling: false,
        isConnectionPaused: false,
        connectionWarning: null,
        canRetryWithRun: false,
        phase: recordPhase,
        parsedData: null,
        atsError: null,
      });
      return;
    }

    // Resume ingestion is complete; now recover latest analysis status
    this.emit({
      resumeId,
      analysisStatus: null,
      activeRunId: null,
      isPolling: false,
      isConnectionPaused: false,
      connectionWarning: null,
      canRetryWithRun: false,
      phase: "loading",
      parsedData: null,
      atsError: null,
    });

    await this.recoverLatestStatus(resumeId, resumeGen);
  }

  public async recoverLatestStatus(
    targetResumeId?: string,
    expectedResumeGen?: number
  ): Promise<void> {
    const resumeId = targetResumeId ?? this.snapshot.resumeId;
    const resumeGen = expectedResumeGen ?? this.resumeGeneration;
    if (!resumeId) return;

    const signal = this.createRequestSignal();
    const actionGen = this.actionGeneration;

    try {
      const statusRes = await this.client.getLatestAnalysisStatus(resumeId, signal);
      if (
        !this.isCurrentResume(resumeId, resumeGen) ||
        this.actionGeneration !== actionGen
      ) {
        return;
      }
      this.applyAnalysisPayload(resumeId, resumeGen, statusRes);
    } catch (err: unknown) {
      if (
        !this.isCurrentResume(resumeId, resumeGen) ||
        this.actionGeneration !== actionGen
      ) {
        return;
      }
      const classified = classifyApiError(err);
      if (classified.kind === "canceled") return;

      this.emit({
        analysisStatus: null,
        activeRunId: null,
        isPolling: false,
        isConnectionPaused: false,
        connectionWarning: null,
        canRetryWithRun: false,
        phase: "ready_for_analysis",
        parsedData: null,
        atsError: this.getErrorMessage(
          err,
          "Unable to check latest analysis status."
        ),
      });
    }
  }

  public async startOrRetryAnalysis(): Promise<void> {
    const { resumeId, phase, activeRunId, isPolling, canRetryWithRun } =
      this.snapshot;

    if (!resumeId || this.inFlightAction || isPolling) {
      return;
    }
    if (
      phase !== "ready_for_analysis" &&
      phase !== "completed" &&
      phase !== "partial" &&
      phase !== "failed"
    ) {
      return;
    }

    const resumeGen = this.resumeGeneration;
    const shouldRetryFailedRun =
      phase === "failed" && canRetryWithRun && Boolean(activeRunId);

    this.inFlightAction = true;
    this.stopPolling();
    const signal = this.createRequestSignal();
    const actionGen = this.actionGeneration;

    this.emit({
      phase: "analyzing",
      atsError: null,
      connectionWarning: null,
      isConnectionPaused: false,
      canRetryWithRun: false,
    });

    try {
      const res =
        shouldRetryFailedRun && activeRunId
          ? await this.client.retryAnalysis(resumeId, activeRunId, signal)
          : await this.client.startAnalysis(resumeId, signal);

      if (
        !this.isCurrentResume(resumeId, resumeGen) ||
        this.actionGeneration !== actionGen
      ) {
        return;
      }
      this.applyAnalysisPayload(resumeId, resumeGen, res);
    } catch (err: unknown) {
      if (
        !this.isCurrentResume(resumeId, resumeGen) ||
        this.actionGeneration !== actionGen
      ) {
        return;
      }

      const classified = classifyApiError(err);
      if (classified.kind === "canceled") return;

      if (classified.kind === "conflict") {
        await this.recoverLatestStatus(resumeId, resumeGen);
        return;
      }

      this.emit({
        isPolling: false,
        isConnectionPaused: false,
        connectionWarning: null,
        canRetryWithRun: false,
        phase: "failed",
        atsError: this.getErrorMessage(
          err,
          "Failed to start AI analysis for this resume."
        ),
      });
    } finally {
      if (this.actionGeneration === actionGen) {
        this.inFlightAction = false;
      }
    }
  }
}
