import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, Radio, Activity } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { AiOrb3D, type OrbState } from './AiOrb3D';
import type { ChatMessage } from '../types';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSpeaking: boolean;
  onSendMessage: (text: string) => void;
  isListening: boolean;
  isVoiceSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}

const SAMPLE_PROMPTS = [
  "What's the weather in Tokyo right now?",
  'What is the current stock price of Apple?',
  'What time is it in London?',
  'Remember that I am building the Zyra agent project',
  'What do you remember about me?',
  'Play Bohemian Rhapsody',
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  isSpeaking,
  onSendMessage,
  isListening,
  isVoiceSupported,
  onStartListening,
  onStopListening,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const getStatusText = () => {
    if (isListening) return 'NEURAL SENSORS LISTENING';
    if (isLoading) return 'PROCESSING KNOWLEDGE & RETRIEVAL';
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
        height: 'calc(100vh - 75px)',
        position: 'relative',
        maxWidth: '1000px',
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
          /* Empty State: Full Sci-Fi 3D Holographic AI Core */
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
                margin: '0 auto 12px',
              }}
            >
              {/* Radial background aura */}
              <div
                style={{
                  position: 'absolute',
                  width: '380px',
                  height: '380px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${getStatusColor()}22 0%, transparent 70%)`,
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                  transition: 'background 0.5s ease',
                }}
              />

              <AiOrb3D
                state={orbState}
                onClick={isVoiceSupported ? (isListening ? onStopListening : onStartListening) : undefined}
              />
            </div>

            {/* Futuristic HUD Telemetry Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 18px',
                borderRadius: '999px',
                background: 'rgba(6, 12, 26, 0.75)',
                border: `1px solid ${getStatusColor()}44`,
                boxShadow: `0 0 16px ${getStatusColor()}22`,
                marginBottom: '14px',
                transition: 'all 0.3s ease',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
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

            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                marginBottom: '6px',
                background: 'linear-gradient(135deg, #ffffff 40%, var(--accent-cyan) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ZYRA NEURAL INTERFACE
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                maxWidth: '440px',
                lineHeight: 1.6,
                marginBottom: '22px',
              }}
            >
              Tap the sphere or speak to engage. Zyra features real-time web retrieval, persistent SQLite memory, and an offline local neural core.
            </p>

            {/* Quick Action Telemetry Chips */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                maxWidth: '680px',
              }}
            >
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'rgba(10, 18, 36, 0.65)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 0 14px rgba(0, 242, 254, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Activity size={12} color="var(--accent-cyan)" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
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
                {/* Scaled Mini Orb in Conversation */}
                <div style={{ width: '48px', height: '48px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ transform: 'scale(0.35)', transformOrigin: 'center center' }}>
                    <AiOrb3D
                      state={orbState}
                      onClick={isVoiceSupported ? (isListening ? onStopListening : onStartListening) : undefined}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(),
                        boxShadow: `0 0 8px ${getStatusColor()}`,
                      }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', letterSpacing: '0.04em' }}>
                      ZYRA NEURAL CORE
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: `${getStatusColor()}15`,
                        color: getStatusColor(),
                        border: `1px solid ${getStatusColor()}33`,
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

              {/* Soundwave equalizer indicator */}
              {(isListening || isSpeaking) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingRight: '8px' }}>
                  <div className="eq-bar" style={{ animationDelay: '0.1s' }} />
                  <div className="eq-bar" style={{ animationDelay: '0.3s' }} />
                  <div className="eq-bar" style={{ animationDelay: '0.5s' }} />
                  <div className="eq-bar" style={{ animationDelay: '0.2s' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <Radio size={12} color="var(--accent-cyan)" />
                  <span>100% OFFLINE / LIVE WEB</span>
                </div>
              )}
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
              gap: '10px',
              color: 'var(--accent-violet)',
              fontSize: '12.5px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              margin: '8px 0',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            <span>Zyra is reasoning and synthesizing response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Action Chips (When Chat is Active) */}
      {messages.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '10px',
            whiteSpace: 'nowrap',
          }}
        >
          {SAMPLE_PROMPTS.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSendMessage(prompt)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(10, 18, 36, 0.65)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
                flexShrink: 0,
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
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Futuristic Sci-Fi Input Dock */}
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
            isListening ? '[AUDIO STREAM ACTIVE] Listening...' : 'Enter prompt or say a command to Zyra...'
          }
          disabled={isLoading}
          style={{
            flex: 1,
            fontSize: '14px',
            color: '#f8fafc',
            padding: '8px 4px',
          }}
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background:
              input.trim() && !isLoading
                ? 'linear-gradient(135deg, #00f2fe 0%, #38bdf8 100%)'
                : 'rgba(255, 255, 255, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            boxShadow:
              input.trim() && !isLoading ? '0 0 18px rgba(0, 242, 254, 0.4)' : 'none',
          }}
        >
          <Send
            size={18}
            color={input.trim() && !isLoading ? '#030712' : '#64748b'}
          />
        </button>
      </form>
    </div>
  );
};
