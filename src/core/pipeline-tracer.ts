import { v4 as uuidv4 } from 'uuid';

export type PipelineNodeType =
  | 'ingestion'
  | 'memory'
  | 'router'
  | 'reasoning'
  | 'tool'
  | 'synthesis'
  | 'hardware';

export interface PipelineNode {
  id: string;
  name: string;
  type: PipelineNodeType;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'error';
  durationMs: number;
  startTime: number;
  endTime?: number;
  input?: any;
  output?: any;
  details?: Record<string, any>;
}

export interface PipelineTrace {
  traceId: string;
  timestamp: string;
  prompt: string;
  totalDurationMs: number;
  nodes: PipelineNode[];
  hardware?: {
    gpuName: string;
    gpuVramUsedMB: number;
    gpuVramTotalMB: number;
    gpuVramPercent: number;
    systemMemoryPercent: number;
  };
}

/**
 * Tracks execution through the nodes of the assistant's model network.
 */
export class PipelineTracer {
  private traceId: string;
  private startTime: number;
  private prompt: string;
  private nodes: Map<string, PipelineNode> = new Map();

  constructor(prompt: string) {
    this.traceId = `trc-${uuidv4().slice(0, 8)}`;
    this.startTime = performance.now();
    this.prompt = prompt;
  }

  /**
   * Starts a new pipeline node in the execution graph.
   */
  public startNode(id: string, name: string, type: PipelineNodeType, input?: any): void {
    const node: PipelineNode = {
      id,
      name,
      type,
      status: 'running',
      durationMs: 0,
      startTime: performance.now(),
      input,
    };
    this.nodes.set(id, node);
  }

  /**
   * Ends an active node, recording its output, details, and duration.
   */
  public endNode(
    id: string,
    output?: any,
    details?: Record<string, any>,
    status: 'completed' | 'error' | 'skipped' = 'completed'
  ): void {
    const node = this.nodes.get(id);
    if (!node) return;

    const now = performance.now();
    node.endTime = now;
    node.durationMs = Math.round((now - node.startTime) * 100) / 100;
    node.status = status;
    if (output !== undefined) node.output = output;
    if (details) node.details = details;
  }

  /**
   * Completes the entire trace and returns the immutable summary.
   */
  public completeTrace(hardware?: PipelineTrace['hardware']): PipelineTrace {
    const totalDurationMs = Math.round((performance.now() - this.startTime) * 100) / 100;
    return {
      traceId: this.traceId,
      timestamp: new Date().toISOString(),
      prompt: this.prompt,
      totalDurationMs,
      nodes: Array.from(this.nodes.values()),
      hardware,
    };
  }
}
