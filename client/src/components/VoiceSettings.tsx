import React from 'react';
import { X, Play, Check, Volume2, Sparkles } from 'lucide-react';
import type { VoiceOption } from '../types';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  voices: VoiceOption[];
  selectedVoice: string;
  onSelectVoice: (id: string) => void;
  onPreviewVoice: (id: string) => void;
  isSpeaking: boolean;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  isOpen,
  onClose,
  voices,
  selectedVoice,
  onSelectVoice,
  onPreviewVoice,
  isSpeaking,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-secondary)',
          borderRadius: '20px',
          border: '1px solid var(--border-subtle)',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(236, 72, 153, 0.4)',
              }}
            >
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Zyra's Voice Persona</h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Select a high-definition neural female voice for spoken responses.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '6px', borderRadius: '8px', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Voice List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
          {voices.map((v) => {
            const isSelected = selectedVoice === v.id;
            return (
              <div
                key={v.id}
                style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                  border: isSelected
                    ? '1px solid rgba(99, 102, 241, 0.5)'
                    : '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{v.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(236, 72, 153, 0.15)',
                        color: '#f472b6',
                        fontWeight: 600,
                      }}
                    >
                      {v.accent}
                    </span>
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#34d399',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <Check size={14} />
                      <span>Active</span>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                  {v.description}
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onPreviewVoice(v.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isSelected && isSpeaking ? 'rgba(236, 72, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected && isSpeaking ? '1px solid rgba(236, 72, 153, 0.5)' : '1px solid var(--border-subtle)',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: isSelected && isSpeaking ? '#f472b6' : 'var(--text-primary)',
                    }}
                  >
                    <Play size={13} fill="currentColor" />
                    <span>{isSelected && isSpeaking ? 'Playing...' : 'Preview Speech'}</span>
                  </button>

                  <button
                    onClick={() => onSelectVoice(v.id)}
                    disabled={isSelected}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isSelected
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
                      color: isSelected ? 'var(--text-muted)' : '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: isSelected ? 'default' : 'pointer',
                    }}
                  >
                    <Volume2 size={14} />
                    <span>{isSelected ? 'Selected' : 'Use This Voice'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
