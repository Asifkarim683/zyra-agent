import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { QuickRoutines } from './components/QuickRoutines';
import { KnowledgeModal } from './components/KnowledgeModal';
import { useVoice } from './hooks/useVoice';
import type { ChatMessage, SystemHealth, RoutineItem } from './types';

function extractSpeechChunk(buffer: string, isFinal = false): { chunk: string; rest: string } | null {
  if (isFinal) {
    const trimmed = buffer.trim();
    return trimmed ? { chunk: trimmed, rest: '' } : null;
  }

  // Look for punctuation (. ! ?) followed by whitespace or double newlines
  const re = /([.!?]+|\n{2,})(?=\s+[A-Z0-9"']|\s*$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(buffer)) !== null) {
    const endIndex = match.index + match[1].length;
    const candidate = buffer.slice(0, endIndex).trim();

    // Check if candidate ends with an abbreviation or digit like '1.', 'e.g.', 'Dr.'
    if (/\b(?:[A-Z]|[A-Za-z]{1,3}\.[A-Za-z]{1,3}|[Dd]r|[Mm]r|[Mm]rs|[Mm]s|[Pp]rof|[Ss]r|[Jj]r|[Vv]s|[Ee]tc|[Ee]\.g|[Ii]\.e|\d+)\.$/i.test(candidate)) {
      continue; // Skip abbreviation or list number
    }

    // Ensure chunk has enough content to avoid micro-stutter (at least 20 chars or 4 words)
    const words = candidate.split(/\s+/).filter(Boolean);
    if (words.length < 4 && candidate.length < 20) {
      continue; // Keep accumulating to prevent buffer underrun
    }

    const rest = buffer.slice(endIndex).trimStart();
    return { chunk: candidate, rest };
  }
  return null;
}

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [isRoutinesOpen, setIsRoutinesOpen] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  // Generate or load persistent conversationId
  const [conversationId, setConversationId] = useState<string>(() => {
    const saved = localStorage.getItem('zyra_conv_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    localStorage.setItem('zyra_conv_id', newId);
    return newId;
  });

  const handleNewChat = useCallback(() => {
    setMessages([]);
    const newId = crypto.randomUUID();
    localStorage.setItem('zyra_conv_id', newId);
    setConversationId(newId);
  }, []);

  // Initialize voice hook with Zyra's exclusive voice
  const voice = useVoice((spokenText) => {
    if (spokenText.trim()) {
      handleSendMessage(spokenText.trim());
    }
  });

  const handleSendMessage = useCallback(
    async (text: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      const assistantMessageId = crypto.randomUUID();
      const assistantPlaceholder: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
      setIsLoading(true);

      // Stop any active speech on new query
      voice.stopSpeaking();

      let streamedText = '';
      let sentenceBuffer = '';

      try {
        const res = await fetch('/api/v1/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationId,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Server returned ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (!part.trim()) continue;

            const lines = part.split('\n');
            let event = '';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                event = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataStr = line.slice(6).trim();
              }
            }

            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (event === 'token' && data.token) {
                streamedText += data.token;
                sentenceBuffer += data.token;

                // Queue speech only on complete grammatical sentence boundaries
                // avoiding abbreviations, numbers, and micro-fragments to eliminate stuttering
                let nextChunk: { chunk: string; rest: string } | null;
                while ((nextChunk = extractSpeechChunk(sentenceBuffer))) {
                  const toSpeak = nextChunk.chunk;
                  sentenceBuffer = nextChunk.rest;
                  if (toSpeak) {
                    voice.queueSentence(toSpeak);
                  }
                }

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: streamedText, statusText: undefined }
                      : m
                  )
                );
              } else if (event === 'status' && data.status) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, statusText: data.status }
                      : m
                  )
                );
              } else if (event === 'done') {
                // Speak any remaining sentence buffer cleanly
                const finalChunk = extractSpeechChunk(sentenceBuffer, true);
                if (finalChunk && finalChunk.chunk) {
                  voice.queueSentence(finalChunk.chunk);
                  sentenceBuffer = '';
                }

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: data.response || streamedText,
                          isStreaming: false,
                          statusText: undefined,
                          provider: data.provider,
                          intent: data.intent,
                          action: data.action,
                          data: data.data,
                          trace: data.trace,
                        }
                      : m
                  )
                );
              } else if (event === 'error') {
                throw new Error(data.error || 'Stream error');
              }
            } catch {
              // Partial JSON or heartbeat
            }
          }
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: `Connection error: ${err.message}. Is the Zyra server running?`,
                  isStreaming: false,
                  statusText: undefined,
                  provider: 'system',
                  action: 'error',
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, voice]
  );

  // Fetch telemetry and routines
  const loadSystemInfo = async () => {
    try {
      const [hRes, rRes] = await Promise.all([
        fetch('/api/v1/health').then((r) => r.json()),
        fetch('/api/v1/routines').then((r) => r.json()),
      ]);
      setHealth(hRes);
      setRoutines(rRes);
    } catch (err) {
      console.warn('Failed to load system telemetry:', err);
    }
  };

  useEffect(() => {
    loadSystemInfo();
    const interval = setInterval(loadSystemInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerRoutine = async (id: string) => {
    const res = await fetch(`/api/v1/routines/${id}/trigger`, { method: 'POST' });
    if (!res.ok) throw new Error('Routine trigger failed');
    const data = await res.json();

    // Add routine execution summary to chat
    if (data.results) {
      const summaryText = data.results.map((r: any) => `• ${r.response}`).join('\n');
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚡ Executed Routine Actions:\n${summaryText}`,
          timestamp: new Date(),
          provider: 'scheduler',
        },
      ]);

      const firstSpoken = data.results.find((r: any) => r.response)?.response;
      if (firstSpoken) {
        voice.speak(firstSpoken);
      }
    }
    return data;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        health={health}
        ttsEnabled={voice.ttsEnabled}
        onToggleTts={() => voice.setTtsEnabled(!voice.ttsEnabled)}
        onOpenRoutines={() => setIsRoutinesOpen(true)}
        onOpenKnowledge={() => setIsKnowledgeOpen(true)}
        onNewChat={handleNewChat}
      />

      <main style={{ flex: 1 }}>
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          isListening={voice.isListening}
          isSpeaking={voice.isSpeaking}
          isVoiceSupported={voice.isSupported}
          onStartListening={voice.startListening}
          onStopListening={voice.stopListening}
          onNewChat={handleNewChat}
        />
      </main>

      <QuickRoutines
        isOpen={isRoutinesOpen}
        onClose={() => setIsRoutinesOpen(false)}
        routines={routines}
        onTriggerRoutine={handleTriggerRoutine}
      />

      <KnowledgeModal
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
      />
    </div>
  );
}
export default App;
