/**
 * Resource Governor — Memory & CPU management for the Paperclip server process.
 *
 * This module provides:
 * 1. Periodic memory pressure monitoring with configurable thresholds
 * 2. Automatic GC hints when memory exceeds soft limits
 * 3. Background task throttling under high memory pressure
 * 4. Server-side cache eviction signals for in-memory stores
 * 5. CPU-aware concurrency gating for heartbeat runs
 *
 * It is designed to prevent the Paperclip server from consuming the
 * entire system's resources on a developer workstation.
 */

import { logger } from "../middleware/logger.js";

/* ---- Configuration ---- */

export interface ResourceGovernorConfig {
  /** How often to sample memory usage (ms). Default: 15 000 */
  sampleIntervalMs: number;
  /** Soft limit: when RSS exceeds this, start shedding caches (bytes). Default: 512 MB */
  memorySoftLimitBytes: number;
  /** Hard limit: when RSS exceeds this, aggressively evict + throttle (bytes). Default: 1 GB */
  memoryHardLimitBytes: number;
  /** Max concurrent heartbeat runs allowed normally. Default: 3 */
  maxConcurrentRunsNormal: number;
  /** Max concurrent heartbeat runs under memory pressure. Default: 1 */
  maxConcurrentRunsPressure: number;
  /** Enable periodic GC hints via global.gc when available. Default: true */
  gcHintsEnabled: boolean;
}

const DEFAULT_CONFIG: ResourceGovernorConfig = {
  sampleIntervalMs: 15_000,
  memorySoftLimitBytes: 512 * 1024 * 1024,   // 512 MB
  memoryHardLimitBytes: 1024 * 1024 * 1024,   // 1 GB
  maxConcurrentRunsNormal: 3,
  maxConcurrentRunsPressure: 1,
  gcHintsEnabled: true,
};

/* ---- Pressure level ---- */

export type PressureLevel = "normal" | "elevated" | "critical";

/* ---- Snapshot ---- */

export interface ResourceSnapshot {
  timestamp: Date;
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  pressureLevel: PressureLevel;
  maxConcurrentRuns: number;
}

/* ---- Listeners ---- */

type PressureChangeListener = (level: PressureLevel, snapshot: ResourceSnapshot) => void;
type CacheEvictionListener = (pressure: PressureLevel) => void;

/* ---- Governor ---- */

let _instance: ResourceGovernor | null = null;

export class ResourceGovernor {
  private config: ResourceGovernorConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private currentPressure: PressureLevel = "normal";
  private lastSnapshot: ResourceSnapshot | null = null;
  private pressureListeners: PressureChangeListener[] = [];
  private evictionListeners: CacheEvictionListener[] = [];
  private consecutiveHighSamples = 0;

  constructor(config: Partial<ResourceGovernorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Singleton accessor */
  static getInstance(config?: Partial<ResourceGovernorConfig>): ResourceGovernor {
    if (!_instance) {
      _instance = new ResourceGovernor(config);
    }
    return _instance;
  }

  /** Start periodic sampling */
  start(): void {
    if (this.timer) return;
    logger.info(
      {
        sampleIntervalMs: this.config.sampleIntervalMs,
        softLimitMB: Math.round(this.config.memorySoftLimitBytes / (1024 * 1024)),
        hardLimitMB: Math.round(this.config.memoryHardLimitBytes / (1024 * 1024)),
      },
      "Resource Governor started",
    );
    // Take an initial sample immediately
    this.sample();
    this.timer = setInterval(() => this.sample(), this.config.sampleIntervalMs);
    this.timer.unref(); // Don't block process exit
  }

  /** Stop periodic sampling */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Register a listener for pressure level changes */
  onPressureChange(listener: PressureChangeListener): () => void {
    this.pressureListeners.push(listener);
    return () => {
      this.pressureListeners = this.pressureListeners.filter((l) => l !== listener);
    };
  }

  /** Register a listener that is called when caches should be evicted */
  onEvict(listener: CacheEvictionListener): () => void {
    this.evictionListeners.push(listener);
    return () => {
      this.evictionListeners = this.evictionListeners.filter((l) => l !== listener);
    };
  }

  /** Get current pressure level */
  getPressureLevel(): PressureLevel {
    return this.currentPressure;
  }

  /** Get the current max-concurrent-runs allowed */
  getMaxConcurrentRuns(): number {
    return this.currentPressure === "normal"
      ? this.config.maxConcurrentRunsNormal
      : this.config.maxConcurrentRunsPressure;
  }

  /** Get the most recent resource snapshot */
  getSnapshot(): ResourceSnapshot | null {
    return this.lastSnapshot;
  }

  /** Force an on-demand sample (used by health endpoint, etc.) */
  sample(): ResourceSnapshot {
    const mem = process.memoryUsage();
    const rss = mem.rss;
    const prevPressure = this.currentPressure;

    let pressureLevel: PressureLevel = "normal";
    if (rss >= this.config.memoryHardLimitBytes) {
      pressureLevel = "critical";
    } else if (rss >= this.config.memorySoftLimitBytes) {
      pressureLevel = "elevated";
    }

    // Track consecutive high samples to avoid false positives from spikes
    if (pressureLevel !== "normal") {
      this.consecutiveHighSamples += 1;
    } else {
      this.consecutiveHighSamples = 0;
    }

    const snapshot: ResourceSnapshot = {
      timestamp: new Date(),
      rssBytes: rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      externalBytes: mem.external,
      pressureLevel,
      maxConcurrentRuns: pressureLevel === "normal"
        ? this.config.maxConcurrentRunsNormal
        : this.config.maxConcurrentRunsPressure,
    };

    this.lastSnapshot = snapshot;
    this.currentPressure = pressureLevel;

    // Pressure level change — log and notify
    if (pressureLevel !== prevPressure) {
      const rssMB = Math.round(rss / (1024 * 1024));
      if (pressureLevel === "critical") {
        logger.warn(
          { rssMB, pressure: pressureLevel },
          `Resource Governor: CRITICAL memory pressure (${rssMB} MB RSS)`,
        );
      } else if (pressureLevel === "elevated") {
        logger.info(
          { rssMB, pressure: pressureLevel },
          `Resource Governor: elevated memory pressure (${rssMB} MB RSS)`,
        );
      } else {
        logger.info(
          { rssMB, pressure: pressureLevel },
          "Resource Governor: memory pressure returned to normal",
        );
      }

      for (const listener of this.pressureListeners) {
        try {
          listener(pressureLevel, snapshot);
        } catch { /* swallow listener errors */ }
      }
    }

    // Cache eviction — only trigger after 2+ consecutive high samples
    if (this.consecutiveHighSamples >= 2 && pressureLevel !== "normal") {
      for (const listener of this.evictionListeners) {
        try {
          listener(pressureLevel);
        } catch { /* swallow listener errors */ }
      }
    }

    // GC hint under pressure
    if (
      this.config.gcHintsEnabled &&
      pressureLevel !== "normal" &&
      typeof (globalThis as any).gc === "function"
    ) {
      try {
        (globalThis as any).gc();
      } catch { /* gc might throw */ }
    }

    return snapshot;
  }
}

/**
 * Resolve the governor config from environment variables.
 */
export function resolveResourceGovernorConfig(): Partial<ResourceGovernorConfig> {
  const config: Partial<ResourceGovernorConfig> = {};

  const sampleInterval = Number(process.env.PAPERCLIP_RESOURCE_SAMPLE_INTERVAL_MS);
  if (sampleInterval > 0) config.sampleIntervalMs = Math.max(5000, sampleInterval);

  const softLimit = Number(process.env.PAPERCLIP_MEMORY_SOFT_LIMIT_MB);
  if (softLimit > 0) config.memorySoftLimitBytes = softLimit * 1024 * 1024;

  const hardLimit = Number(process.env.PAPERCLIP_MEMORY_HARD_LIMIT_MB);
  if (hardLimit > 0) config.memoryHardLimitBytes = hardLimit * 1024 * 1024;

  const maxRunsNormal = Number(process.env.PAPERCLIP_MAX_CONCURRENT_RUNS);
  if (maxRunsNormal > 0) config.maxConcurrentRunsNormal = Math.min(maxRunsNormal, 10);

  const maxRunsPressure = Number(process.env.PAPERCLIP_MAX_CONCURRENT_RUNS_PRESSURE);
  if (maxRunsPressure > 0) config.maxConcurrentRunsPressure = Math.min(maxRunsPressure, 5);

  return config;
}
