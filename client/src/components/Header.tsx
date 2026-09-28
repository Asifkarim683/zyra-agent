import React from 'react';
import { Volume2, VolumeX, Sparkles, Cpu, Layers, PlayCircle, Mic } from 'lucide-react';
import type { SystemHealth } from '../types';

interface HeaderProps {
  health: SystemHealth | null;
  ttsEnabled: boolean;
  selectedVoice: string;
  onToggleTts: () => void;
  onOpenSkills: () => void;
  onOpenRoutines: () => void;
  onOpenVoiceSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  ttsEnabled,
  selectedVoice,
  onToggleTts,
  onOpenSkills,
  onOpenRoutines,
  onOpenVoiceSettings,
}) => {
  const voiceShortName = selectedVoice.includes('Aria')
    ? 'Aria'
    : selectedVoice.includes('Jenny')
    ? 'Jenny'
    : selectedVoice.includes('Sonia')
    ? 'Sonia (UK)'
    : selectedVoice.includes('Ana')
    ? 'Ana'
    : 'Neural';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            position: 'relative',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Sparkles size={22} color="#ffffff" />
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: health?.status === 'ok' ? '#10b981' : '#f59e0b',
              border: '2px solid #0a0d14',
            }}
          />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {health?.assistant || 'Zyra'}
            </h1>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontWeight: 600,
              }}
            >
              v{health?.version || '1.0'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Personal Assistant for {health?.owner || 'Eren'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* LLM Mode Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
          title="LLM Routing Engine"
        >
          <Cpu size={14} color="#38bdf8" />
          <span>Mode: <strong style={{ color: 'var(--text-primary)' }}>{health?.llmMode || 'auto'}</strong></span>
        </div>

        {/* Voice Persona Picker Button */}
        <button
          onClick={onOpenVoiceSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            background: 'rgba(236, 72, 153, 0.12)',
            border: '1px solid rgba(236, 72, 153, 0.35)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#f472b6',
          }}
          title="Customize Zyra's Female Voice"
        >
          <Mic size={14} color="#f472b6" />
          <span>Voice: {voiceShortName}</span>
        </button>

        {/* Routines Button */}
        <button
          onClick={onOpenRoutines}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <PlayCircle size={14} color="#f59e0b" />
          <span>Routines</span>
        </button>

        {/* Skills Button */}
        <button
          onClick={onOpenSkills}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          <Layers size={14} color="#38bdf8" />
          <span>Skills ({health?.activeSkills ?? 6})</span>
        </button>

        {/* TTS Toggle */}
        <button
          onClick={onToggleTts}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: ttsEnabled ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${ttsEnabled ? 'var(--border-active)' : 'var(--border-subtle)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={ttsEnabled ? 'Mute Voice Responses' : 'Enable Voice Responses'}
        >
          {ttsEnabled ? (
            <Volume2 size={16} color="#818cf8" />
          ) : (
            <VolumeX size={16} color="#64748b" />
          )}
        </button>
      </div>
    </header>
  );
};
