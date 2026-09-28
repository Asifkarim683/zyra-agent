import React, { useState, useEffect } from 'react';
import { X, Database, Trash2, Plus, Check, RefreshCw } from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose }) => {
  const [memories, setMemories] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

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

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    const formattedKey = newKey.trim().toLowerCase().replace(/\s+/g, '_');
    try {
      const res = await fetch('/api/v1/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: formattedKey,
          value: newValue.trim(),
        }),
      });

      if (res.ok) {
        setSavedStatus(`Saved "${formattedKey}"`);
        setNewKey('');
        setNewValue('');
        setTimeout(() => setSavedStatus(null), 2500);
        await loadMemories();
      }
    } catch (err) {
      console.error('Failed to save memory:', err);
    }
  };

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
          maxWidth: '580px',
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
                // PERSISTENT SQLITE DATABASE
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', marginTop: '1px' }}>
                Long-Term Memory Core
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Facts & preferences stored persistently across all conversations in <code style={{ color: '#38bdf8' }}>data/zyra.db</code>.
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

        {/* Add / Update Fact Form */}
        <form
          onSubmit={handleSaveMemory}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(10, 18, 36, 0.7)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '18px',
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
            + ADD OR MODIFY FACT
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Key (e.g. favorite_food, job)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12.5px',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <input
              type="text"
              placeholder="Value (e.g. Sushi, Engineer)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              style={{
                flex: 1.5,
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12.5px',
                color: '#ffffff',
              }}
            />
            <button
              type="submit"
              disabled={!newKey.trim() || !newValue.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: newKey.trim() && newValue.trim()
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: newKey.trim() && newValue.trim() ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: newKey.trim() && newValue.trim() ? 'pointer' : 'not-allowed',
                boxShadow: newKey.trim() && newValue.trim() ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              <Plus size={14} />
              <span>Save</span>
            </button>
          </div>
          {savedStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#10b981' }}>
              <Check size={12} />
              <span>{savedStatus}</span>
            </div>
          )}
        </form>

        {/* Stored Facts List */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            STORED FACTS ({memoryKeys.length})
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {memoryKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No facts stored yet. Tell Zyra <em>"Remember that..."</em> in chat or add one above!
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
                  background: 'rgba(10, 18, 36, 0.5)',
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
