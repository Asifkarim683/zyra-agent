import { execSync } from 'child_process';
import os from 'os';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import type { PipelineTrace } from '../core/pipeline-tracer.js';

export interface HardwareTelemetry {
  gpuName: string;
  gpuVramUsedMB: number;
  gpuVramTotalMB: number;
  gpuVramPercent: number;
  gpuTemperatureC: number;
  gpuUtilizationPercent: number;
  systemMemoryTotalMB: number;
  systemMemoryUsedMB: number;
  systemMemoryPercent: number;
  cpuModel: string;
  cpuCores: number;
  platform: string;
  updatedAt: string;
}

export interface ModelNodeTelemetry {
  provider: string;
  model: string;
  status: 'online' | 'offline' | 'degraded';
  contextWindow: number;
  baseUrl: string;
}

/**
 * Service providing real-time hardware telemetry and pipeline trace monitoring.
 */
export class TelemetryService {
  private cachedHardware: HardwareTelemetry | null = null;
  private lastHardwareCheck = 0;
  private recentTraces: PipelineTrace[] = [];
  private maxTraces = 30;

  /**
   * Retrieves current GPU and system hardware metrics with caching.
   */
  public async getHardwareTelemetry(): Promise<HardwareTelemetry> {
    const now = Date.now();
    if (this.cachedHardware && now - this.lastHardwareCheck < 3000) {
      return this.cachedHardware;
    }

    const totalSysMem = Math.round(os.totalmem() / (1024 * 1024));
    const freeSysMem = Math.round(os.freemem() / (1024 * 1024));
    const usedSysMem = totalSysMem - freeSysMem;
    const sysMemPercent = Math.round((usedSysMem / totalSysMem) * 100);

    let gpuName = 'Integrated / CPU Fallback';
    let gpuUsedMB = 0;
    let gpuTotalMB = 0;
    let gpuPercent = 0;
    let gpuTemp = 0;
    let gpuUtil = 0;

    try {
      if (process.platform === 'win32' || process.platform === 'linux') {
        const output = execSync(
          'nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv,noheader,nounits',
          { timeout: 1500, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
        ).trim();

        if (output) {
          const parts = output.split(',').map((p) => p.trim());
          if (parts.length >= 5) {
            gpuName = parts[0];
            gpuUsedMB = parseInt(parts[1], 10) || 0;
            gpuTotalMB = parseInt(parts[2], 10) || 0;
            gpuPercent = gpuTotalMB > 0 ? Math.round((gpuUsedMB / gpuTotalMB) * 100) : 0;
            gpuUtil = parseInt(parts[3], 10) || 0;
            gpuTemp = parseInt(parts[4], 10) || 0;
          }
        }
      }
    } catch {
      // Non-NVIDIA or command failed; fallback gracefully
    }

    const telemetry: HardwareTelemetry = {
      gpuName,
      gpuVramUsedMB: gpuUsedMB,
      gpuVramTotalMB: gpuTotalMB,
      gpuVramPercent: gpuPercent,
      gpuTemperatureC: gpuTemp,
      gpuUtilizationPercent: gpuUtil,
      systemMemoryTotalMB: totalSysMem,
      systemMemoryUsedMB: usedSysMem,
      systemMemoryPercent: sysMemPercent,
      cpuModel: os.cpus()[0]?.model || 'Unknown CPU',
      cpuCores: os.cpus().length,
      platform: `${process.platform} (${os.arch()})`,
      updatedAt: new Date().toISOString(),
    };

    this.cachedHardware = telemetry;
    this.lastHardwareCheck = now;
    return telemetry;
  }

  /**
   * Retrieves active model runtime node information.
   */
  public async getModelNodeTelemetry(): Promise<ModelNodeTelemetry> {
    let status: 'online' | 'offline' = 'offline';
    try {
      const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        status = 'online';
      }
    } catch {
      status = 'offline';
    }

    return {
      provider: config.llmMode,
      model: config.ollamaModel,
      status,
      contextWindow: 4096,
      baseUrl: config.ollamaBaseUrl,
    };
  }

  /**
   * Records a completed pipeline execution trace into the ring buffer.
   */
  public recordTrace(trace: PipelineTrace): void {
    this.recentTraces.unshift(trace);
    if (this.recentTraces.length > this.maxTraces) {
      this.recentTraces.pop();
    }
  }

  /**
   * Retrieves the most recent pipeline traces.
   */
  public getRecentTraces(limit = 10): PipelineTrace[] {
    return this.recentTraces.slice(0, limit);
  }
}
