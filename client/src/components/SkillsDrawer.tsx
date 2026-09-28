import React from 'react';
import { X, Layers, Music, Clock, Bell, Power, HelpCircle, MessageSquare } from 'lucide-react';
import type { SkillItem } from '../types';

interface SkillsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  skills: SkillItem[];
  onSelectCommand: (cmd: string) => void;
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  greeting: <MessageSquare size={16} color="#818cf8" />,
  time: <Clock size={16} color="#38bdf8" />,
  alarm: <Bell size={16} color="#f59e0b" />,
  music: <Music size={16} color="#ec4899" />,
  control: <Power size={16} color="#ef4444" />,
  'system-info': <HelpCircle size={16} color="#10b981" />,
};

const SKILL_EXAMPLES: Record<string, string[]> = {
  greeting: ['Hello Zyra', 'Good morning', 'Hey'],
  time: ['What time is it', 'Current time', 'What is today date'],
  alarm: ['Set alarm for 7:00 AM', 'Wake me up at 6:30', 'Remind me to buy groceries'],
  music: ['Play Daft Punk', 'Play Bohemian Rhapsody', 'Play some music'],
  control: ['Stop', 'Pause', 'Cancel'],
  'system-info': ['How are you', 'System status', 'Are you online'],
};

export const SkillsDrawer: React.FC<SkillsDrawerProps> = ({
  isOpen,
  onClose,
  skills,
  onSelectCommand,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={18} color="#38bdf8" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Installed Skills</h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Modular handlers dispatched directly by the Intent Router.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: '6px', borderRadius: '8px', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
          {skills.map((skill) => (
            <div
              key={skill.name}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                {SKILL_ICONS[skill.name] || <Layers size={16} color="#818cf8" />}
                <span style={{ fontWeight: 600, fontSize: '14.5px', textTransform: 'capitalize' }}>
                  {skill.name}
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                {skill.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(SKILL_EXAMPLES[skill.name] || []).map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      onSelectCommand(example);
                      onClose();
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
