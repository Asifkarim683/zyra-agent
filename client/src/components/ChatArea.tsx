import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles, Loader2 } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../types';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  isListening: boolean;
  isVoiceSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}

const SAMPLE_PROMPTS = [
  'What time is it?',
  'Play Daft Punk',
  'Set alarm for 7:00 AM',
  'How are you?',
  'Stop',
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onSendMessage,
  isListening,
  isVoiceSupported,
  onStartListening,
  onStopListening,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 75px)',
        position: 'relative',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
        padding: '0 20px',
      }}
    >
      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              maxWidth: '460px',
              padding: '40px 20px',
              background: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px solid var(--border-subtle)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Sparkles size={28} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Welcome back, Eren
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Zyra is ready. Ask simple commands to trigger fast skills locally, or ask open-ended questions for reasoning.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
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
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              padding: '8px 0',
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            <span>Zyra is processing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Actions */}
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
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSendMessage(prompt)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                flexShrink: 0,
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Dock */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px',
          marginBottom: '20px',
          background: 'var(--bg-glass)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
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
              borderRadius: '12px',
              background: isListening ? '#ef4444' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${isListening ? '#ef4444' : 'var(--border-subtle)'}`,
            }}
            title={isListening ? 'Stop Listening' : 'Speak to Zyra'}
          >
            {isListening ? (
              <MicOff size={18} color="#ffffff" />
            ) : (
              <Mic size={18} color="var(--text-secondary)" />
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isListening ? 'Listening for your voice...' : 'Ask Zyra anything or give a command...'
          }
          disabled={isLoading}
          style={{
            flex: 1,
            fontSize: '14.5px',
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
            borderRadius: '12px',
            background: input.trim() && !isLoading
              ? 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)'
              : 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            boxShadow: input.trim() && !isLoading ? '0 0 16px rgba(99, 102, 241, 0.4)' : 'none',
          }}
        >
          <Send size={18} color={input.trim() && !isLoading ? '#ffffff' : '#64748b'} />
        </button>
      </form>
    </div>
  );
};
