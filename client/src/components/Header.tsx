import React from 'react';
import { Volume2, VolumeX, Sparkles, Cpu, Layers, PlayCircle, Database, Plus } from 'lucide-react';
import type { SystemHealth } from '../types';

interface HeaderProps {
  health: SystemHealth | null;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onOpenSkills: () => void;
  onOpenRoutines: () => void;
  onNewChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  ttsEnabled,
  onToggleTts,
  onOpenSkills,
  onOpenRoutines,
  onNewChat,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)',
          }}
        >
          <Sparkles size={20} color="#030712" />
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: health?.status === 'ok' ? '#10b981' : '#f59e0b',
              boxShadow: health?.status === 'ok' ? '0 0 8px #10b981' : 'none',
              border: '2px solid #030712',
            }}
          />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1
              style={{
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-mono)',
                color: '#ffffff',
              }}
            >
              {health?.assistant?.toUpperCase() || 'ZYRA'}
            </h1>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(0, 242, 254, 0.1)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              v{health?.version || '1.0'} [NEURAL CORE]
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Cybernetic AI Assistant for <strong style={{ color: '#ffffff' }}>{health?.owner || 'Eren'}</strong>
          </p>
        </div>
      </div>

      {/* Sci-Fi HUD Action Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* SQLite Memory Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: 'rgba(10, 18, 36, 0.6)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
          }}
          title="Persistent SQLite Long-Term Memory Active"
        >
          <Database size={12} color="#10b981" />
          <span>MEMORY: <strong style={{ color: '#10b981' }}>SQLITE</strong></span>
        </div>

        {/* LLM Engine Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: 'rgba(10, 18, 36, 0.6)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
          }}
          title="Ollama Local LLM Model Active"
        >
          <Cpu size={12} color="#a855f7" />
          <span>LLM: <strong style={{ color: '#a855f7' }}>LLAMA 3.2</strong></span>
        </div>

        {/* New Chat Button */}
        {onNewChat && (
          <button
            onClick={onNewChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 11px',
              borderRadius: '8px',
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 254, 0.16)';
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.25)';
            }}
            title="Start New Chat Session"
          >
            <Plus size={13} />
            <span>NEW CHAT</span>
          </button>
        )}

        {/* Routines Button */}
        <button
          onClick={onOpenRoutines}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 11px',
            borderRadius: '8px',
            background: 'rgba(10, 18, 36, 0.6)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#f59e0b';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'inherit';
          }}
        >
          <PlayCircle size={13} color="#f59e0b" />
          <span>ROUTINES</span>
        </button>

        {/* Skills Button */}
        <button
          onClick={onOpenSkills}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 11px',
            borderRadius: '8px',
            background: 'rgba(10, 18, 36, 0.6)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'inherit';
          }}
        >
          <Layers size={13} color="var(--accent-cyan)" />
          <span>SKILLS ({health?.activeSkills ?? 8})</span>
        </button>

        {/* Voice Audio Mute / Unmute Toggle */}
        <button
          onClick={onToggleTts}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: ttsEnabled ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${ttsEnabled ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: ttsEnabled ? '0 0 12px rgba(0, 242, 254, 0.25)' : 'none',
            cursor: 'pointer',
          }}
          title={ttsEnabled ? 'Neural Audio Voice Enabled' : 'Neural Voice Muted'}
        >
          {ttsEnabled ? (
            <Volume2 size={15} color="var(--accent-cyan)" />
          ) : (
            <VolumeX size={15} color="#64748b" />
          )}
        </button>
      </div>
    </header>
  );
};
