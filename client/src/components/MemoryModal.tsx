import React, { useState, useEffect } from 'react';
import { X, Database, Trash2, RefreshCw, MessageSquare } from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/memory');
      const data = await res.json();
      setMemories(data.memories || {});
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen]);

  const handleDeleteMemory = async (key: string) => {
    try {
      const res = await fetch(`/api/v1/memory/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadMemories();
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  if (!isOpen) return null;

  const memoryKeys = Object.keys(memories);

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
          border: '1px solid rgba(16, 185, 129, 0.35)',
          padding: '26px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
              }}
            >
              <Database size={20} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', color: '#10b981', textTransform: 'uppercase' }}>
                // LONG-TERM MEMORY CORE
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', marginTop: '1px' }}>
                Saved Facts & Preferences
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Persisted in <code style={{ color: '#38bdf8' }}>data/zyra.db</code> and injected into Zyra's context.
              </p>
            </div>
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

        {/* Natural Chat Instructions Callout */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600, marginBottom: '6px' }}>
            <MessageSquare size={13} />
            <span>CONTROL MEMORY DIRECTLY IN CHAT</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
            You don't need manual forms — simply speak or type to Zyra naturally:
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: '#f1f5f9',
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '5px 8px', borderRadius: '6px' }}>
              • "My favorite food is sushi"
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '5px 8px', borderRadius: '6px' }}>
              • "Change my city to Tokyo"
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '5px 8px', borderRadius: '6px' }}>
              • "What is my favorite food?"
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '5px 8px', borderRadius: '6px' }}>
              • "Forget my favorite color"
            </div>
          </div>
        </div>

        {/* Stored Facts Header & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            ACTIVE MEMORIES ({memoryKeys.length})
          </span>
          <button
            onClick={loadMemories}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stored Facts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {memoryKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No facts stored yet. Just tell Zyra in chat, like <em>"My favorite food is sushi"</em>!
            </div>
          ) : (
            memoryKeys.map((key) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(10, 18, 36, 0.55)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '13px', color: '#f8fafc', wordBreak: 'break-word' }}>
                    {memories[key]}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteMemory(key)}
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  title={`Delete memory "${key}"`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
