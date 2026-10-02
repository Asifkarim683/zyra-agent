import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { QuickRoutines } from './components/QuickRoutines';
import { KnowledgeModal } from './components/KnowledgeModal';
import { useVoice } from './hooks/useVoice';
import type { ChatMessage, SystemHealth, RoutineItem, BriefingData } from './types';

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

export function cleanForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Strip markdown code fences (triple backticks)
    .replace(/```[\s\S]*?```/g, '')
    // Strip inline code (single backticks)
    .replace(/`([^`]+)`/g, '$1')
    // Convert markdown links [title](url) -> title
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/\S+/gi, '')
    // Remove markdown headers (#, ##, ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquote arrows (> )
    .replace(/^>\s+/gm, '')
    // Remove bullet points (•, *, -) and numeric list prefixes (1., 2.)
    .replace(/^[ \t]*[•\-\*]+[ \t]*/gm, '')
    .replace(/^[ \t]*\d+\.[ \t]*/gm, '')
    // Remove bold/italics (*, _)
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/[*_]/g, '')
    // Remove pipe characters
    .replace(/[|]/g, ', ')
    // Normalize degree symbol
    .replace(/°C/g, ' degrees Celsius')
    .replace(/°F/g, ' degrees Fahrenheit')
    // Collapse excess whitespace and trim
    .replace(/\s+/g, ' ')
    .trim();
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

  const handleSendMessageRef = useRef<(text: string) => void>(() => {});

  // Initialize voice hook with Zyra's exclusive voice
  const voice = useVoice((spokenText) => {
    if (spokenText.trim()) {
      handleSendMessageRef.current(spokenText.trim());
    }
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    voice.stopSpeaking();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming
          ? {
              ...m,
              isStreaming: false,
              statusText: undefined,
              content: m.content ? `${m.content} [Stopped]` : 'Process stopped.',
            }
          : m
      )
    );
  }, [voice]);

  const handleNewChat = useCallback(() => {
    handleStop();
    setMessages([]);
    const newId = crypto.randomUUID();
    localStorage.setItem('zyra_conv_id', newId);
    setConversationId(newId);
  }, [handleStop]);

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

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const res = await fetch('/api/v1/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
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

                // If this is a briefing response, suppress interim streaming audio chunks;
                // we deliver the ultra-clean natural voiceText on the 'done' event instead.
                const isBriefing =
                  streamedText.includes('Briefing') ||
                  streamedText.startsWith('###') ||
                  streamedText.startsWith('#');

                if (!isBriefing) {
                  let nextChunk: { chunk: string; rest: string } | null;
                  while ((nextChunk = extractSpeechChunk(sentenceBuffer))) {
                    const toSpeak = cleanForSpeech(nextChunk.chunk);
                    sentenceBuffer = nextChunk.rest;
                    if (toSpeak) {
                      voice.queueSentence(toSpeak);
                    }
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
                if (data.data?.briefing?.voiceText) {
                  voice.stopSpeaking();
                  if (voice.ttsEnabled) {
                    voice.speak(cleanForSpeech(data.data.briefing.voiceText));
                  }
                  sentenceBuffer = '';
                } else {
                  // Speak any remaining sentence buffer cleanly
                  const finalChunk = extractSpeechChunk(sentenceBuffer, true);
                  if (finalChunk && finalChunk.chunk) {
                    const toSpeak = cleanForSpeech(finalChunk.chunk);
                    if (toSpeak) {
                      voice.queueSentence(toSpeak);
                    }
                  }
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
        if (err.name === 'AbortError') {
          return;
        }
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
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    },
    [conversationId, voice]
  );

  handleSendMessageRef.current = handleSendMessage;

  // Fetch telemetry, routines, and pending proactive voice briefings
  const loadSystemInfo = async () => {
    try {
      const [hRes, rRes, bRes] = await Promise.all([
        fetch('/api/v1/health').then((r) => r.json()),
        fetch('/api/v1/routines').then((r) => r.json()),
        fetch('/api/v1/briefings/pending').then((r) => r.json()).catch(() => ({ pending: [] })),
      ]);
      setHealth(hRes);
      setRoutines(rRes);

      // Proactively deliver scheduled briefings if ready
      if (bRes.pending && Array.isArray(bRes.pending) && bRes.pending.length > 0) {
        for (const notif of bRes.pending) {
          // Immediately acknowledge to prevent duplicate delivery or loops
          fetch('/api/v1/briefings/ack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: notif.id }),
          }).catch(() => {});

          // Speak proactive notifications aloud WITHOUT writing in chat
          if (voice.ttsEnabled && notif.voiceText && !isLoading) {
            voice.speak(cleanForSpeech(notif.voiceText));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load system telemetry:', err);
    }
  };

  useEffect(() => {
    loadSystemInfo();
    const interval = setInterval(loadSystemInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const startupBriefingTriggeredRef = useRef(false);

  useEffect(() => {
    // Proactive Voice Startup Briefing:
    // Dynamically generate and speak briefing on startup of application WITHOUT writing in chat.
    if (startupBriefingTriggeredRef.current) return;
    startupBriefingTriggeredRef.current = true;

    const runStartupBriefing = async () => {
      try {
        const res = await fetch('/api/v1/briefings/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forNotification: false }),
        });
        if (!res.ok) return;
        const data: BriefingData = await res.json();

        if (data.voiceText && voice.ttsEnabled) {
          const speech = cleanForSpeech(data.voiceText);

          // Attempt immediate playback
          voice.speak(speech);

          // Browsers enforce autoplay gesture policies on fresh un-interacted page loads.
          // Attach a one-time window interaction listener to guarantee it speaks on first click/key if blocked.
          let hasPlayed = false;
          const unlockAutoplay = () => {
            if (hasPlayed) return;
            hasPlayed = true;
            window.removeEventListener('click', unlockAutoplay);
            window.removeEventListener('keydown', unlockAutoplay);
            if (!voice.isSpeaking) {
              voice.speak(speech);
            }
          };

          window.addEventListener('click', unlockAutoplay, { once: true });
          window.addEventListener('keydown', unlockAutoplay, { once: true });
        }
      } catch (err) {
        console.warn('Failed to deliver startup voice briefing:', err);
      }
    };

    // Small delay so audio context and components are stabilized
    const timer = setTimeout(runStartupBriefing, 400);
    return () => clearTimeout(timer);
  }, [voice]);

  const handleTriggerBriefing = useCallback(async () => {
    try {
      // Toggle off if currently speaking
      if (voice.isSpeaking) {
        voice.stopSpeaking();
        return;
      }

      voice.stopSpeaking();
      setIsLoading(true);
      const res = await fetch('/api/v1/briefings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forNotification: false }),
      });
      if (!res.ok) throw new Error('Failed to generate intelligence briefing');
      const data: BriefingData = await res.json();
      setIsLoading(false);

      // Speak live briefing aloud WITHOUT writing in chat
      if (voice.ttsEnabled && data.voiceText) {
        voice.speak(cleanForSpeech(data.voiceText));
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error('Briefing error:', err);
    }
  }, [voice]);

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

      // Check if routine generated a briefing voice report
      const briefingResult = data.results.find((r: any) => r.data?.briefing)?.data?.briefing;
      const textToSpeak = briefingResult?.voiceText || data.results.find((r: any) => r.response)?.response;
      if (textToSpeak && voice.ttsEnabled) {
        voice.speak(cleanForSpeech(textToSpeak));
      }
    }
    return data;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        health={health}
        ttsEnabled={voice.ttsEnabled}
        isSpeaking={voice.isSpeaking}
        onToggleTts={() => voice.setTtsEnabled(!voice.ttsEnabled)}
        onOpenRoutines={() => setIsRoutinesOpen(true)}
        onOpenKnowledge={() => setIsKnowledgeOpen(true)}
        onTriggerBriefing={handleTriggerBriefing}
        onNewChat={handleNewChat}
      />

      <main style={{ flex: 1 }}>
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onStop={handleStop}
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
