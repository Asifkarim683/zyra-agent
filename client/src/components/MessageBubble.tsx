import React, { useState } from 'react';
import { Bot, User, Zap, Terminal, ShieldAlert, CheckCircle2, XCircle, Play, Pause, Square, Globe, ExternalLink, BookOpen, FileText, Calculator, Radio, Music, Disc3 } from 'lucide-react';
import type { ChatMessage, WebSource, KnowledgeChunk, MusicTrack } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  currentTrack?: MusicTrack | null;
  isMusicPlaying?: boolean;
  onTogglePlayMusic?: () => void;
  onSelectTrack?: (track: MusicTrack) => void;
  onStopMusic?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentTrack,
  isMusicPlaying,
  onTogglePlayMusic,
  onSelectTrack,
  onStopMusic,
}) => {
  const isUser = message.role === 'user';
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled' | 'error'>('pending');
  const [statusText, setStatusText] = useState<string>('');
  const [showSpotifyWidget, setShowSpotifyWidget] = useState<boolean>(false);

  const handleConfirm = async () => {
    try {
      const res = await fetch('/api/v1/automation/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: message.data?.actionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('confirmed');
        setStatusText(data.message || 'Action executed successfully.');
      } else {
        setStatus('error');
        setStatusText(data.error || 'Execution failed.');
      }
    } catch (err: any) {
      setStatus('error');
      setStatusText(err.message || 'Execution failed.');
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch('/api/v1/automation/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: message.data?.actionId }),
      });
      const data = await res.json();
      setStatus('cancelled');
      setStatusText(data.message || 'Action cancelled.');
    } catch (err: any) {
      setStatus('cancelled');
      setStatusText('Action cancelled.');
    }
  };

  const timeString = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(message.timestamp));

  return (
    <div
      className="animate-message"
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: '14px',
        alignItems: 'flex-start',
        marginBottom: '22px',
      }}
    >
      {/* Sci-Fi Avatar */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isUser
            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
            : 'linear-gradient(135deg, #0e2748 0%, #0369a1 100%)',
          border: isUser
            ? '1px solid rgba(129, 140, 248, 0.4)'
            : '1px solid rgba(56, 189, 248, 0.6)',
          boxShadow: isUser
            ? '0 0 14px rgba(99, 102, 241, 0.2)'
            : '0 0 16px rgba(56, 189, 248, 0.35)',
        }}
      >
        {isUser ? <User size={18} color="#a5b4fc" /> : <Bot size={18} color="#38bdf8" />}
      </div>

      {/* Bubble Container */}
      <div
        style={{
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: '14px 18px',
            borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            background: isUser
              ? 'linear-gradient(135deg, rgba(67, 56, 202, 0.35) 0%, rgba(49, 46, 129, 0.55) 100%)'
              : 'linear-gradient(135deg, rgba(10, 22, 40, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: isUser
              ? '1px solid rgba(165, 180, 252, 0.35)'
              : '1px solid rgba(56, 189, 248, 0.25)',
            color: '#f1f5f9',
            fontSize: '14.5px',
            lineHeight: 1.6,
            backdropFilter: 'blur(16px)',
            boxShadow: isUser
              ? '0 4px 20px rgba(79, 70, 229, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(56, 189, 248, 0.05), inset 0 1px 0 rgba(56, 189, 248, 0.15)',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {/* Subtle top indicator bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: isUser ? 'auto' : '12px',
              right: isUser ? '12px' : 'auto',
              width: '28px',
              height: '2px',
              background: isUser ? '#818cf8' : '#38bdf8',
              boxShadow: isUser ? '0 0 8px #818cf8' : '0 0 8px #38bdf8',
              borderRadius: '2px',
            }}
          />

          {/* Real-time status text during tool execution */}
          {!isUser && message.statusText && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                marginBottom: message.content ? '8px' : '0',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontSize: '11.5px',
                fontFamily: 'monospace',
                color: '#38bdf8',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#00f2fe',
                  boxShadow: '0 0 8px #00f2fe',
                }}
              />
              <span>{message.statusText}</span>
            </div>
          )}

          {message.content}

          {/* Real-time streaming cursor */}
          {!isUser && message.isStreaming && (
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '14px',
                background: '#00f2fe',
                marginLeft: '4px',
                verticalAlign: 'text-bottom',
                borderRadius: '1px',
                boxShadow: '0 0 8px #00f2fe',
              }}
            />
          )}

          {/* Live Web Sources Citations */}
          {!isUser && message.data?.sources && Array.isArray(message.data.sources) && message.data.sources.length > 0 && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace',
                }}
              >
                <Globe size={13} color="#38bdf8" />
                <span>LIVE WEB SOURCES ({message.data.sources.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {message.data.sources.map((src: WebSource, idx: number) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(56, 189, 248, 0.18)',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)';
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.18)';
                      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: '#e2e8f0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {src.title || src.url}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                        {src.domain && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                            }}
                          >
                            {src.domain}
                          </span>
                        )}
                        <ExternalLink size={12} color="#38bdf8" />
                      </div>
                    </div>
                    {src.snippet && (
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#94a3b8',
                          lineHeight: 1.45,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {src.snippet}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Base Citations */}
          {!isUser && message.data?.knowledge && Array.isArray(message.data.knowledge) && message.data.knowledge.length > 0 && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.05)',
                border: '1px solid rgba(168, 85, 247, 0.22)',
                boxShadow: '0 0 16px rgba(168, 85, 247, 0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px',
                  color: '#c084fc',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace',
                }}
              >
                <BookOpen size={13} color="#c084fc" />
                <span>KNOWLEDGE BASE CITATIONS ({message.data.knowledge.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {message.data.knowledge.map((chunk: KnowledgeChunk, idx: number) => (
                  <div
                    key={chunk.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(168, 85, 247, 0.18)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={13} color="#c084fc" />
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#e2e8f0' }}>
                          {chunk.title || chunk.source}
                        </span>
                      </div>
                      {typeof chunk.score === 'number' && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          {Math.round(chunk.score * 100)}% match
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: '#94a3b8',
                        lineHeight: 1.45,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {chunk.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safe Math & Code Execution Sandbox Card */}
          {message.data?.calculation && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(6, 78, 59, 0.16)',
                border: '1px solid rgba(52, 211, 153, 0.32)',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calculator size={13} color="#34d399" />
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      letterSpacing: '0.08em',
                      color: '#34d399',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    Safe Math & Code Sandbox
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.18)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.28)',
                  }}
                >
                  ⚡ {message.data.calculation.executionTimeMs}ms
                </span>
              </div>

              <div
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  color: '#e2e8f0',
                  marginBottom: '6px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                <span style={{ color: '#94a3b8' }}>eval&gt; </span>
                <span style={{ color: '#38bdf8' }}>{message.data.calculation.code}</span>
              </div>

              {message.data.calculation.error ? (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#f87171',
                    fontFamily: 'monospace',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                >
                  {message.data.calculation.error}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '11.5px',
                    color: '#a7f3d0',
                    fontFamily: 'monospace',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.22)',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '6px',
                  }}
                >
                  <span style={{ color: '#6ee7b7', fontWeight: 600 }}>result:</span>
                  <span style={{ wordBreak: 'break-all' }}>
                    {message.data.calculation.formattedResult || String(message.data.calculation.result)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Proactive Voice Briefing Badge */}
          {message.data?.briefing && (
            <div
              style={{
                marginTop: '10px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Radio size={13} color="#38bdf8" />
              <span
                style={{
                  fontSize: '10.5px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.06em',
                  color: '#38bdf8',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Neural Voice Briefing Synthesized • British Persona
              </span>
            </div>
          )}

          {/* Small Dynamic Interactive Music Player Interface */}
          {message.data?.music?.track && (() => {
            const track = message.data.music.track;
            const isThisTrack = Boolean(currentTrack && currentTrack.id === track.id);
            const isThisTrackPlaying = Boolean(isThisTrack && isMusicPlaying);
            const isSpotify = track.platform === 'spotify';
            const accentColor = isSpotify ? '#10b981' : '#38bdf8';
            const accentLight = isSpotify ? '#34d399' : '#38bdf8';

            return (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
                  border: isThisTrackPlaying
                    ? `1px solid ${isSpotify ? 'rgba(16, 185, 129, 0.6)' : 'rgba(6, 182, 212, 0.6)'}`
                    : `1px solid ${isSpotify ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.25)'}`,
                  boxShadow: isThisTrackPlaying
                    ? `0 0 20px ${isSpotify ? 'rgba(16, 185, 129, 0.25)' : 'rgba(6, 182, 212, 0.25)'}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
                    : '0 4px 15px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  width: '100%',
                  maxWidth: '440px',
                }}
              >
                {/* Header Bar of the Music Card */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Music size={13} color={isThisTrackPlaying ? accentLight : '#94a3b8'} className={isThisTrackPlaying ? 'animate-pulse' : ''} />
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.06em',
                        color: isThisTrackPlaying ? accentLight : '#94a3b8',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {isThisTrackPlaying ? 'Now Streaming' : isThisTrack ? 'Playback Paused' : 'Music Track'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isSpotify ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isSpotify ? '#34d399' : '#f87171',
                        border: `1px solid ${isSpotify ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}
                    >
                      {track.platform}
                    </span>

                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open in ${isSpotify ? 'Spotify' : 'YouTube'}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#94a3b8',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = accentLight; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Main Track Display & Controls Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    {/* Thumbnail / Disc Icon */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative',
                        border: `1px solid ${isSpotify ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                      }}
                    >
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            background: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: accentLight,
                          }}
                        >
                          <Disc3 size={20} className={isThisTrackPlaying ? 'animate-spin' : ''} />
                        </div>
                      )}
                    </div>

                    {/* Title & Artist */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#f8fafc',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={track.title}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '1px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{track.artist}</span>
                        {track.duration && (
                          <span style={{ fontSize: '10px', color: '#64748b' }}>• {track.duration}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Animated Equalizer Wave (when playing) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px', padding: '0 4px', flexShrink: 0 }}>
                    {[35, 75, 95, 45, 85, 60, 100, 50].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: '2.5px',
                          borderRadius: '2px',
                          background: isThisTrackPlaying ? accentColor : 'rgba(148, 163, 184, 0.3)',
                          height: isThisTrackPlaying ? `${h}%` : '20%',
                          transition: 'height 0.2s ease',
                        }}
                      />
                    ))}
                  </div>

                  {/* Interactive Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        if (isThisTrack) {
                          if (onTogglePlayMusic) onTogglePlayMusic();
                        } else {
                          if (onSelectTrack) onSelectTrack(track);
                        }
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isThisTrackPlaying
                          ? isSpotify
                            ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                            : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                          : isSpotify
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                        border: `1px solid ${isSpotify ? 'rgba(52, 211, 153, 0.5)' : 'rgba(56, 189, 248, 0.5)'}`,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: `0 0 10px ${isSpotify ? 'rgba(16, 185, 129, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`,
                        transition: 'all 0.15s ease',
                      }}
                      title={isThisTrackPlaying ? 'Pause' : 'Play'}
                    >
                      {isThisTrackPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '1px' }} />}
                    </button>

                    {isThisTrack && (
                      <button
                        onClick={() => {
                          if (onStopMusic) onStopMusic();
                        }}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Stop Playback"
                      >
                        <Square size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional Expandable Official Spotify Player Widget */}
                {isSpotify && track.embedUrl && (
                  <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        onClick={() => setShowSpotifyWidget((v) => !v)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#34d399',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 0',
                          opacity: 0.9,
                        }}
                      >
                        <span>{showSpotifyWidget ? '▲ Hide Spotify Widget' : '▼ Open Official Spotify Widget'}</span>
                      </button>
                    </div>

                    {showSpotifyWidget && (
                      <div
                        style={{
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          height: '80px',
                          background: '#000000',
                        }}
                      >
                        <iframe
                          src={track.embedUrl}
                          width="100%"
                          height="80"
                          frameBorder="0"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          style={{ border: 0 }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* System Automation Confirmation Card */}
          {message.action === 'pending_confirmation' && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                boxShadow: '0 0 15px rgba(245, 158, 11, 0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace',
                }}
              >
                <ShieldAlert size={14} color="#fbbf24" />
                <span>CONFIRMATION REQUIRED</span>
              </div>

              <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '8px' }}>
                Target: <strong style={{ color: '#38bdf8' }}>{message.data?.target || 'Desktop App'}</strong>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {message.data?.description || 'Automated OS execution'}
                </div>
              </div>

              {status === 'pending' ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={handleConfirm}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <Play size={12} />
                    Confirm & Execute
                  </button>
                  <button
                    onClick={handleCancel}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: status === 'confirmed' ? '#34d399' : status === 'cancelled' ? '#94a3b8' : '#f87171',
                    padding: '4px 0',
                  }}
                >
                  {status === 'confirmed' && <CheckCircle2 size={15} color="#34d399" />}
                  {status === 'cancelled' && <XCircle size={15} color="#94a3b8" />}
                  <span>{statusText}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Telemetry Metadata Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'rgba(148, 163, 184, 0.7)' }}>{timeString}</span>

          {message.intent && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '1px 7px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.08)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              <Zap size={10} />
              {message.intent.intent.toUpperCase()} ({Math.round(message.intent.confidence * 100)}%)
            </span>
          )}

          {message.provider && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '1px 7px',
                borderRadius: '4px',
                background: message.provider === 'skill'
                  ? 'rgba(16, 185, 129, 0.08)'
                  : 'rgba(168, 85, 247, 0.08)',
                color: message.provider === 'skill' ? '#34d399' : '#c084fc',
                border: `1px solid ${message.provider === 'skill' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              <Terminal size={10} />
              {message.provider.toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
