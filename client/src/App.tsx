import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { QuickRoutines } from './components/QuickRoutines';
import { SkillsDrawer } from './components/SkillsDrawer';
import { VoiceSettings } from './components/VoiceSettings';
import { useVoice } from './hooks/useVoice';
import type { ChatMessage, SystemHealth, SkillItem, RoutineItem, VoiceOption } from './types';

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isRoutinesOpen, setIsRoutinesOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);

  // Generate or load persistent conversationId
  const [conversationId] = useState<string>(() => {
    const saved = localStorage.getItem('zyra_conv_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    localStorage.setItem('zyra_conv_id', newId);
    return newId;
  });

  // Initialize voice hook with neural streaming audio
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

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const res = await fetch('/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationId,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          provider: data.provider,
          intent: data.intent,
          action: data.action,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Speak response using Zyra's unique neural female voice
        if (data.response) {
          voice.speak(data.response);
        }
      } catch (err: any) {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Connection error: ${err.message}. Is the Zyra server running?`,
          timestamp: new Date(),
          provider: 'system',
          action: 'error',
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, voice]
  );

  // Fetch telemetry, skills, routines, and neural voices
  const loadSystemInfo = async () => {
    try {
      const [hRes, sRes, rRes, vRes] = await Promise.all([
        fetch('/api/v1/health').then((r) => r.json()),
        fetch('/api/v1/skills').then((r) => r.json()),
        fetch('/api/v1/routines').then((r) => r.json()),
        fetch('/api/v1/voice/voices').then((r) => r.json()).catch(() => ({ voices: [] })),
      ]);
      setHealth(hRes);
      setSkills(sRes);
      setRoutines(rRes);
      if (vRes.voices) setVoices(vRes.voices);
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
      // Speak the routine greeting/music summary
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
        selectedVoice={voice.selectedVoice}
        onToggleTts={() => voice.setTtsEnabled(!voice.ttsEnabled)}
        onOpenSkills={() => setIsSkillsOpen(true)}
        onOpenRoutines={() => setIsRoutinesOpen(true)}
        onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
      />

      <main style={{ flex: 1 }}>
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          isListening={voice.isListening}
          isVoiceSupported={voice.isSupported}
          onStartListening={voice.startListening}
          onStopListening={voice.stopListening}
        />
      </main>

      <SkillsDrawer
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
        skills={skills}
        onSelectCommand={handleSendMessage}
      />

      <QuickRoutines
        isOpen={isRoutinesOpen}
        onClose={() => setIsRoutinesOpen(false)}
        routines={routines}
        onTriggerRoutine={handleTriggerRoutine}
      />

      <VoiceSettings
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        voices={voices}
        selectedVoice={voice.selectedVoice}
        onSelectVoice={(id) => {
          voice.changeVoice(id);
          setIsVoiceSettingsOpen(false);
        }}
        onPreviewVoice={voice.previewVoice}
        isSpeaking={voice.isSpeaking}
      />
    </div>
  );
}
export default App;
