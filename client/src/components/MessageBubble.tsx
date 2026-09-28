import React from 'react';
import { Bot, User, Zap, Terminal } from 'lucide-react';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

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
          {message.content}
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
