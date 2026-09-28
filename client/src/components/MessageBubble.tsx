import React from 'react';
import { Bot, User, Zap, Terminal } from 'lucide-react';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const timeString = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(message.timestamp));

  return (
    <div
      className="animate-message"
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: '12px',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isUser
            ? 'linear-gradient(135deg, #374151 0%, #1f2937 100%)'
            : 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
          boxShadow: isUser
            ? 'none'
            : '0 0 12px rgba(99, 102, 241, 0.3)',
        }}
      >
        {isUser ? <User size={18} color="#94a3b8" /> : <Bot size={18} color="#ffffff" />}
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
            padding: '12px 18px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isUser
              ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
              : 'rgba(17, 24, 39, 0.75)',
            border: isUser
              ? '1px solid rgba(129, 140, 248, 0.3)'
              : '1px solid var(--border-subtle)',
            color: '#f8fafc',
            fontSize: '14.5px',
            lineHeight: 1.55,
            backdropFilter: 'blur(10px)',
            boxShadow: isUser
              ? '0 4px 14px rgba(79, 70, 229, 0.25)'
              : '0 4px 14px rgba(0, 0, 0, 0.2)',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </div>

        {/* Metadata Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <span>{timeString}</span>

          {message.intent && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontWeight: 600,
              }}
            >
              <Zap size={10} />
              {message.intent.intent} ({Math.round(message.intent.confidence * 100)}%)
            </span>
          )}

          {message.provider && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: message.provider === 'skill'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(99, 102, 241, 0.1)',
                color: message.provider === 'skill' ? '#34d399' : '#818cf8',
                border: `1px solid ${message.provider === 'skill' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                fontWeight: 500,
              }}
            >
              <Terminal size={10} />
              {message.provider}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
