import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Cpu, Database, Wrench, Sparkles, ShieldCheck, Clock } from 'lucide-react';
import type { PipelineTrace, PipelineNode } from '../types';

interface NodePipelineInspectorProps {
  trace: PipelineTrace;
}

export const NodePipelineInspector: React.FC<NodePipelineInspectorProps> = ({ trace }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!trace || !trace.nodes || trace.nodes.length === 0) {
    return null;
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'ingestion':
        return <ShieldCheck size={13} className="text-emerald-400" />;
      case 'memory':
        return <Database size={13} className="text-cyan-400" />;
      case 'router':
        return <Clock size={13} className="text-amber-400" />;
      case 'reasoning':
        return <Cpu size={13} className="text-purple-400" />;
      case 'tool':
        return <Wrench size={13} className="text-orange-400" />;
      case 'synthesis':
        return <Sparkles size={13} className="text-pink-400" />;
      default:
        return <Activity size={13} className="text-blue-400" />;
    }
  };

  const getNodeBadgeColor = (type: string) => {
    switch (type) {
      case 'ingestion':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
      case 'memory':
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
      case 'router':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      case 'reasoning':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-300';
      case 'tool':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-300';
      case 'synthesis':
        return 'bg-pink-500/10 border-pink-500/30 text-pink-300';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
    }
  };

  const gpuInfo = trace.hardware?.gpuName && trace.hardware.gpuVramTotalMB > 0
    ? `${trace.hardware.gpuName.replace('NVIDIA GeForce ', '')} • ${Math.round(trace.hardware.gpuVramUsedMB)}MB / ${Math.round(trace.hardware.gpuVramTotalMB)}MB (${trace.hardware.gpuVramPercent}%)`
    : null;

  return (
    <div className="mt-2.5 pt-2 border-t border-white/5">
      {/* Collapsed Bar / Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/20 hover:bg-black/40 border border-white/5 hover:border-cyan-500/30 transition-all text-left group"
      >
        <div className="flex items-center gap-2 text-xs font-mono">
          <Activity size={12} className="text-cyan-400 animate-pulse" />
          <span className="text-slate-300 font-semibold tracking-wide">
            Model Network Trace
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            {trace.nodes.length} Nodes • {Math.round(trace.totalDurationMs)}ms
          </span>
          {gpuInfo && (
            <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-sans">
              🎮 {gpuInfo}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-cyan-300">
          <span>{isOpen ? 'Hide Graph' : 'Inspect Nodes'}</span>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {/* Expanded Node Graph Monitor */}
      {isOpen && (
        <div className="mt-2 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/20 backdrop-blur-md space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-[10px] font-mono text-slate-400">
            <span>PIPELINE EXECUTION GRAPH</span>
            <span>TRACE ID: {trace.traceId}</span>
          </div>

          {/* Node Items */}
          <div className="space-y-1.5">
            {trace.nodes.map((node: PipelineNode, idx: number) => (
              <div
                key={node.id || idx}
                className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-black/40 border border-white/10">
                      {getNodeIcon(node.type)}
                    </span>
                    <span className="font-medium text-slate-200">{node.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono uppercase ${getNodeBadgeColor(node.type)}`}>
                      {node.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-cyan-400">{Math.round(node.durationMs)}ms</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded ${node.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {node.status}
                    </span>
                  </div>
                </div>

                {/* Node Details / Payload Preview */}
                {(node.output || node.input || node.details) && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[11px] font-mono text-slate-400 space-y-0.5">
                    {node.input && (
                      <div className="truncate">
                        <span className="text-slate-500">In:</span>{' '}
                        <span className="text-slate-300">
                          {typeof node.input === 'object' ? JSON.stringify(node.input) : String(node.input)}
                        </span>
                      </div>
                    )}
                    {node.output && (
                      <div className="truncate">
                        <span className="text-slate-500">Out:</span>{' '}
                        <span className="text-emerald-300/90">
                          {typeof node.output === 'object' ? JSON.stringify(node.output) : String(node.output)}
                        </span>
                      </div>
                    )}
                    {node.details?.metrics && (
                      <div className="flex items-center gap-3 text-[10px] text-purple-300/90 pt-0.5">
                        {node.details.metrics.evalCount > 0 && (
                          <span>⚡ {node.details.metrics.evalCount} tokens</span>
                        )}
                        {node.details.metrics.tokensPerSecond > 0 && (
                          <span>⚡ {node.details.metrics.tokensPerSecond} tok/s</span>
                        )}
                        {node.details.metrics.evalDurationMs > 0 && (
                          <span>⏱️ {node.details.metrics.evalDurationMs}ms eval</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Telemetry */}
          {trace.hardware && (
            <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400">
              <span>🎮 {trace.hardware.gpuName}</span>
              <span>
                VRAM: {trace.hardware.gpuVramUsedMB}MB / {trace.hardware.gpuVramTotalMB}MB ({trace.hardware.gpuVramPercent}%)
              </span>
              <span>SYS RAM: {trace.hardware.systemMemoryPercent}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
