import React, { useState } from 'react';
import { X, Play, Clock, CheckCircle2 } from 'lucide-react';
import type { RoutineItem } from '../types';

interface QuickRoutinesProps {
  isOpen: boolean;
  onClose: () => void;
  routines: RoutineItem[];
  onTriggerRoutine: (id: string) => Promise<any>;
}

export const QuickRoutines: React.FC<QuickRoutinesProps> = ({
  isOpen,
  onClose,
  routines,
  onTriggerRoutine,
}) => {
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ id: string; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTrigger = async (id: string) => {
    setTriggeringId(id);
    setLastResult(null);
    try {
      const res = await onTriggerRoutine(id);
      const actionSummary = res.results?.map((r: any) => r.response).join(' | ');
      setLastResult({ id, message: actionSummary || 'Routine completed successfully.' });
    } catch (err: any) {
      setLastResult({ id, message: `Failed: ${err.message}` });
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="hud-panel animate-message"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 14, 26, 0.98) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          padding: '26px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.12em', color: '#f59e0b', textTransform: 'uppercase' }}>
                // AUTOMATION PROTOCOLS
              </span>
            </div>
            <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>Scheduled Routines</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Deterministic workflows executed autonomously on scheduled cron intervals.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
          {routines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              No routines configured yet.
            </div>
          ) : (
            routines.map((routine) => (
              <div
                key={routine.id}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{routine.name}</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Clock size={11} />
                    <span>{routine.cronExpression}</span>
                  </div>
                </div>

                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Actions ({routine.actions.length}):{' '}
                  <span style={{ color: 'var(--accent-cyan)' }}>
                    {routine.actions.map((a) => `${a.skill}:${a.intent}`).join(' ➔ ')}
                  </span>
                </div>

                {lastResult?.id === routine.id && (
                  <div
                    style={{
                      marginBottom: '12px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{lastResult.message}</span>
                  </div>
                )}

                <button
                  onClick={() => handleTrigger(routine.id)}
                  disabled={triggeringId === routine.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={14} fill="#ffffff" />
                  <span>{triggeringId === routine.id ? 'Running Actions...' : 'Trigger Now'}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
