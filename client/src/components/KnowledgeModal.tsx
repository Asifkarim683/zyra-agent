import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  FileText,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
} from 'lucide-react';
import type { DocumentItem, KnowledgeChunk } from '../types';

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'add' | 'search'>('docs');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingSource, setDeletingSource] = useState<string | null>(null);

  // Ingestion form state
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [content, setContent] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search test state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load documents
  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/v1/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      setIngestStatus(null);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Document Ingestion
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsIngesting(true);
    setIngestStatus(null);

    try {
      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          source: source.trim() || title.trim(),
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIngestStatus({
          type: 'success',
          message: data.message || `Indexed ${data.chunkCount} chunks successfully.`,
        });
        setTitle('');
        setSource('');
        setContent('');
        loadDocuments();
      } else {
        setIngestStatus({
          type: 'error',
          message: data.error || 'Failed to ingest document.',
        });
      }
    } catch (err: any) {
      setIngestStatus({
        type: 'error',
        message: err.message || 'Error communicating with vector ingestion engine.',
      });
    } finally {
      setIsIngesting(false);
    }
  };

  // Handle Document Deletion
  const handleDeleteDoc = async (docSource: string) => {
    setDeletingSource(docSource);
    try {
      const res = await fetch(`/api/v1/documents/${encodeURIComponent(docSource)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadDocuments();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeletingSource(null);
    }
  };

  // Handle Semantic Query
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/v1/documents/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          limit: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Semantic search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(14px)',
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
          maxWidth: '680px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(9, 14, 26, 0.98) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '22px 26px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)',
              }}
            >
              <BookOpen size={20} color="#38bdf8" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.12em',
                  color: '#38bdf8',
                  textTransform: 'uppercase',
                }}
              >
                // RAG & VECTOR KNOWLEDGE BASE
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '1px' }}>
                Local Document Intelligence
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                768-dim embeddings via Ollama <code style={{ color: '#38bdf8' }}>nomic-embed-text</code> & SQLite.
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
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 26px',
            background: 'rgba(10, 18, 36, 0.5)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setActiveTab('docs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'docs' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: activeTab === 'docs' ? '1px solid #38bdf8' : '1px solid transparent',
              color: activeTab === 'docs' ? '#38bdf8' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={13} />
            <span>INDEXED DOCS ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'add' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: activeTab === 'add' ? '1px solid #38bdf8' : '1px solid transparent',
              color: activeTab === 'add' ? '#38bdf8' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={13} />
            <span>ADD DOCUMENT / NOTE</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'search' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: activeTab === 'search' ? '1px solid #38bdf8' : '1px solid transparent',
              color: activeTab === 'search' ? '#38bdf8' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            <Search size={13} />
            <span>TEST SEMANTIC SEARCH</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 26px' }}>
          {/* TAB 1: Indexed Documents List */}
          {activeTab === 'docs' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  ACTIVE KNOWLEDGE ASSETS
                </span>
                <button
                  onClick={loadDocuments}
                  disabled={loadingDocs}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={11} className={loadingDocs ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingDocs ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Scanning local vector database...
                </div>
              ) : documents.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--border-subtle)',
                  }}
                >
                  <Database size={32} color="#64748b" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>
                    No Documents Indexed Yet
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                    Ingest notes, specs, or documentation so Zyra can autonomously cite and answer questions based on your private data.
                  </p>
                  <button
                    onClick={() => setActiveTab('add')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} />
                    Add First Document
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {documents.map((doc) => (
                    <div
                      key={doc.source}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(56, 189, 248, 0.16)',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: '#38bdf8',
                            marginTop: '2px',
                          }}
                        >
                          <FileText size={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 600,
                              color: '#f1f5f9',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {doc.title}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontFamily: 'monospace',
                                color: '#94a3b8',
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {doc.source}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontFamily: 'monospace',
                                color: '#34d399',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {doc.chunkCount} vector {doc.chunkCount === 1 ? 'chunk' : 'chunks'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDoc(doc.source)}
                        disabled={deletingSource === doc.source}
                        style={{
                          padding: '7px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                        }}
                        title="Delete document and remove all vector chunks"
                      >
                        <Trash2 size={14} className={deletingSource === doc.source ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Add Document / Note */}
          {activeTab === 'add' && (
            <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Project Apollo Engineering Specifications"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Source / Filename Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. apollo_specs.md or notes.txt"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Document Content *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste raw markdown, meeting notes, project specs, or manuals here. Zyra will automatically split into overlapping semantic chunks and generate 768-dimensional embeddings."
                  required
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {ingestStatus && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: ingestStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${ingestStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: ingestStatus.type === 'success' ? '#34d399' : '#f87171',
                    fontSize: '12px',
                  }}
                >
                  {ingestStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{ingestStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isIngesting || !title.trim() || !content.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: '1px solid #38bdf8',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isIngesting ? 'not-allowed' : 'pointer',
                  opacity: isIngesting ? 0.7 : 1,
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {isIngesting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Chunking & Generating Embeddings...</span>
                  </>
                ) : (
                  <>
                    <Layers size={14} />
                    <span>Ingest & Vectorize Document</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: Test Semantic Search */}
          {activeTab === 'search' && (
            <div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask a question or test semantic similarity (e.g. Apollo battery system)..."
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: isSearching ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Search size={14} className={isSearching ? 'animate-spin' : ''} />
                  <span>Search</span>
                </button>
              </form>

              {isSearching ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Computing cosine similarity across vector store...
                </div>
              ) : hasSearched && searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No matching chunks exceeded the similarity threshold for this query.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {searchResults.map((result, idx) => (
                    <div
                      key={result.id || idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={13} color="#c084fc" />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                            {result.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#94a3b8',
                            }}
                          >
                            {result.source}
                          </span>
                        </div>

                        {typeof result.score === 'number' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: '60px',
                                height: '6px',
                                borderRadius: '3px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(0, result.score * 100))}%`,
                                  height: '100%',
                                  background: result.score > 0.6 ? '#10b981' : result.score > 0.4 ? '#38bdf8' : '#f59e0b',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontFamily: 'monospace',
                                color: result.score > 0.6 ? '#34d399' : '#38bdf8',
                                fontWeight: 600,
                              }}
                            >
                              {Math.round(result.score * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: '#cbd5e1',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'sans-serif',
                          background: 'rgba(0, 0, 0, 0.25)',
                          padding: '8px 10px',
                          borderRadius: '6px',
                        }}
                      >
                        {result.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
