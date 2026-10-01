import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, RotateCcw, Square } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { AiOrb3D, type OrbState } from './AiOrb3D';
import type { ChatMessage } from '../types';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSpeaking: boolean;
  onSendMessage: (text: string) => void;
  onStop?: () => void;
  isListening: boolean;
  isVoiceSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onNewChat?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  isSpeaking,
  onSendMessage,
  onStop,
  isListening,
  isVoiceSupported,
  onStartListening,
  onStopListening,
  onNewChat,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute 3D Orb state
  const orbState: OrbState = isListening
    ? 'listening'
    : isLoading
    ? 'thinking'
    : isSpeaking
    ? 'speaking'
    : 'idle';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoading && onStop) {
        onStop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onStop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const getStatusText = () => {
    if (isListening) return 'NEURAL SENSORS LISTENING';
    if (isLoading) return 'PROCESSING KNOWLEDGE';
    if (isSpeaking) return 'TRANSMITTING NEURAL SPEECH';
    return 'NEURAL CORE SYNCHRONIZED';
  };

  const getStatusColor = () => {
    if (isListening) return '#10b981';
    if (isLoading) return '#a855f7';
    if (isSpeaking) return '#00f2fe';
    return '#38bdf8';
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 72px)',
        position: 'relative',
        maxWidth: '920px',
        margin: '0 auto',
        width: '100%',
        padding: '0 20px',
      }}
    >
      {/* Messages & 3D Interactive Centerpiece */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.length === 0 ? (
          /* Clean Minimalist Empty State: 3D Holographic AI Core */
          <div
            style={{
              margin: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '20px 0',
              width: '100%',
            }}
          >
            {/* 3D Holographic AI Sphere */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              {/* Radial ambient glow */}
              <div
                style={{
                  position: 'absolute',
                  width: '320px',
                  height: '320px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${getStatusColor()}24 0%, transparent 68%)`,
                  filter: 'blur(35px)',
                  pointerEvents: 'none',
                  transition: 'background 0.5s ease',
                }}
              />

              <AiOrb3D
                state={orbState}
                size={280}
                onClick={isVoiceSupported ? (isListening ? onStopListening : onStartListening) : undefined}
              />
            </div>

            {/* Clean Telemetry Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 16px',
                borderRadius: '999px',
                background: 'rgba(6, 12, 26, 0.75)',
                border: `1px solid ${getStatusColor()}40`,
                boxShadow: `0 0 16px ${getStatusColor()}20`,
                marginBottom: '16px',
                transition: 'all 0.3s ease',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(),
                  boxShadow: `0 0 10px ${getStatusColor()}`,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: getStatusColor(),
                }}
              >
                {getStatusText()}
              </span>

              {/* Soundwave Bars when active */}
              {(isListening || isSpeaking) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
                  <div className="eq-bar" style={{ animationDelay: '0.1s' }} />
                  <div className="eq-bar" style={{ animationDelay: '0.3s' }} />
                  <div className="eq-bar" style={{ animationDelay: '0.5s' }} />
                  <div className="eq-bar" style={{ animationDelay: '0.2s' }} />
                </div>
              )}
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                marginBottom: '8px',
                background: 'linear-gradient(135deg, #ffffff 40%, var(--accent-cyan) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Zyra Neural Core
            </h1>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                maxWidth: '460px',
                lineHeight: 1.6,
              }}
            >
              Tap the sphere or microphone to speak, or type any command below.
            </p>
          </div>
        ) : (
          /* Active Chat Stream with Compact Floating Holographic AI Core */
          <>
            {/* Holographic Companion Top Status Dock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                marginBottom: '16px',
                borderRadius: '12px',
                background: 'rgba(6, 12, 26, 0.75)',
                border: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AiOrb3D
                  state={orbState}
                  size={46}
                  onClick={isVoiceSupported ? (isListening ? onStopListening : onStartListening) : undefined}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', letterSpacing: '0.02em' }}>
                      Zyra
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: `${getStatusColor()}15`,
                        color: getStatusColor(),
                        border: `1px solid ${getStatusColor()}30`,
                        fontWeight: 600,
                      }}
                    >
                      {orbState.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {getStatusText()}
                  </span>
                </div>
              </div>

              {/* Status & Reset Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(isListening || isSpeaking) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <div className="eq-bar" style={{ animationDelay: '0.1s' }} />
                    <div className="eq-bar" style={{ animationDelay: '0.3s' }} />
                    <div className="eq-bar" style={{ animationDelay: '0.5s' }} />
                    <div className="eq-bar" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}

                {onNewChat && (
                  <button
                    onClick={onNewChat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                    title="Start New Chat"
                  >
                    <RotateCcw size={12} />
                    <span>NEW CHAT</span>
                  </button>
                )}
              </div>
            </div>

            {/* Messages List */}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </>
        )}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              color: 'var(--accent-violet)',
              fontSize: '12.5px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              margin: '8px 0',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={16} className="animate-spin" color="#c084fc" />
              <span>Zyra is reasoning and synthesizing response...</span>
            </div>
            {onStop && (
              <button
                type="button"
                onClick={onStop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                }}
                title="Stop generation & speech (Esc)"
              >
                <Square size={10} fill="currentColor" />
                <span>STOP</span>
              </button>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Clean Futuristic Sci-Fi Input Dock */}
      <form
        onSubmit={handleSubmit}
        className="hud-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          marginBottom: '18px',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {isVoiceSupported && (
          <button
            type="button"
            onClick={isListening ? onStopListening : onStartListening}
            className={isListening ? 'listening-pulse' : ''}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: isListening
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'rgba(255, 255, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${isListening ? '#10b981' : 'var(--border-subtle)'}`,
              boxShadow: isListening ? '0 0 18px rgba(16, 185, 129, 0.4)' : 'none',
              cursor: 'pointer',
            }}
            title={isListening ? 'Stop Listening' : 'Speak to Zyra'}
          >
            {isListening ? (
              <MicOff size={18} color="#ffffff" />
            ) : (
              <Mic size={18} color="var(--accent-cyan)" />
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isListening ? 'Listening to voice stream...' : 'Ask Zyra anything or give a command...'
          }
          disabled={isLoading}
          style={{
            flex: 1,
            fontSize: '14px',
            color: '#f8fafc',
            padding: '8px 4px',
          }}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.4) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              boxShadow: '0 0 18px rgba(239, 68, 68, 0.45)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.45) 0%, rgba(185, 28, 28, 0.6) 100%)';
              e.currentTarget.style.boxShadow = '0 0 24px rgba(239, 68, 68, 0.7)';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.4) 100%)';
              e.currentTarget.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.45)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.65)';
            }}
            title="Stop generation & speech (Esc)"
          >
            <Square size={16} color="#fca5a5" fill="#fca5a5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background:
                input.trim()
                  ? 'linear-gradient(135deg, #00f2fe 0%, #38bdf8 100%)'
                  : 'rgba(255, 255, 255, 0.04)',
              border: input.trim() ? 'none' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              boxShadow:
                input.trim() ? '0 0 18px rgba(0, 242, 254, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Send Message"
          >
            <Send
              size={18}
              color={input.trim() ? '#030712' : '#64748b'}
            />
          </button>
        )}
      </form>
    </div>
  );
};
