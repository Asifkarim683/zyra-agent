import { useState, useEffect, useRef, useCallback } from 'react';

// Declare SpeechRecognition interfaces for browsers
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const ZYRA_VOICE_ID = 'en-GB-SoniaNeural';

interface SpeechQueueItem {
  id: string;
  text: string;
  blobPromise: Promise<string | null>;
}

const fetchAudioBlob = async (text: string, retries = 2): Promise<string | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 11000);
    try {
      const url = `/api/v1/voice/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(ZYRA_VOICE_ID)}&rate=%2B14%25`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch {
      clearTimeout(timeoutId);
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return null;
};

export function useVoice(onSpeechResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const speechQueueRef = useRef<SpeechQueueItem[]>([]);
  const isSpeakingRef = useRef(false);

  // Stop any playing speech immediately (barge-in)
  const stopSpeaking = useCallback(() => {
    speechQueueRef.current.forEach((item) => {
      item.blobPromise.then((url) => {
        if (url) URL.revokeObjectURL(url);
      }).catch(() => {});
    });
    speechQueueRef.current = [];
    isSpeakingRef.current = false;

    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        // Barge-in: interrupt speech when user starts speaking
        stopSpeaking();
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onSpeechResult(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onSpeechResult, stopSpeaking]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        stopSpeaking();
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  }, [isListening, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const findZyraVoice = useCallback(() => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Strictly match British female voices so browser fallback aligns with Zyra's persona
    return (
      voices.find((v) => v.name.includes('Sonia')) ||
      voices.find((v) => v.name.includes('Libby') || v.name.includes('Maisie') || v.name.includes('Mia')) ||
      voices.find((v) => v.name.includes('Hazel') || v.name.includes('Susan')) ||
      voices.find((v) => v.name.includes('Google UK English Female')) ||
      voices.find((v) => v.lang === 'en-GB' && !v.name.includes('George') && !v.name.includes('Ryan')) ||
      voices.find((v) => v.lang === 'en-GB') ||
      voices.find((v) => (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Jenny')) && v.lang.startsWith('en')) ||
      null
    );
  }, []);

  const speakWithBrowser = useCallback((text: string, onDone: () => void) => {
    if (!window.speechSynthesis) {
      onDone();
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      const voice = findZyraVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'en-GB';
      }

      utterance.onend = () => onDone();
      utterance.onerror = () => onDone();

      window.speechSynthesis.speak(utterance);
    } catch {
      onDone();
    }
  }, [findZyraVoice]);

  const playNextInQueue = useCallback(async () => {
    if (speechQueueRef.current.length === 0) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      return;
    }

    if (isSpeakingRef.current) return;

    const nextItem = speechQueueRef.current.shift();
    if (!nextItem) {
      playNextInQueue();
      return;
    }

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    let blobUrl: string | null = null;
    try {
      blobUrl = await nextItem.blobPromise;
    } catch {
      blobUrl = null;
    }

    // Check if user barged in / stopped speaking while waiting for blob download
    if (!isSpeakingRef.current) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      return;
    }

    const finishAndAdvance = () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
      audioRef.current = null;
      isSpeakingRef.current = false;
      playNextInQueue();
    };

    if (blobUrl) {
      const audio = new Audio(blobUrl);
      audioRef.current = audio;
      activeBlobUrlRef.current = blobUrl;

      audio.onended = finishAndAdvance;

      audio.onerror = () => {
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
          activeBlobUrlRef.current = null;
        }
        audioRef.current = null;
        // Cleanly advance to the next sentence; never abruptly switch to a different voice mid-conversation
        finishAndAdvance();
      };

      audio.play().catch(() => {
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
          activeBlobUrlRef.current = null;
        }
        audioRef.current = null;
        finishAndAdvance();
      });
    } else {
      // If neural audio was unavailable for this chunk, cleanly advance rather than jumping to a jarring robotic voice
      finishAndAdvance();
    }
  }, []);

  const queueSentence = useCallback(
    (sentence: string) => {
      if (!ttsEnabled) return;
      const cleaned = sentence
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[*#_~>]/g, '')
        .trim();
      if (!cleaned) return;

      const item: SpeechQueueItem = {
        id: crypto.randomUUID(),
        text: cleaned,
        blobPromise: fetchAudioBlob(cleaned),
      };

      speechQueueRef.current.push(item);
      playNextInQueue();
    },
    [ttsEnabled, playNextInQueue]
  );

  const speak = useCallback(
    async (text: string) => {
      if (!ttsEnabled) return;
      stopSpeaking();
      const cleaned = text
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[*#_~>]/g, '')
        .trim();
      if (!cleaned) return;

      const blobUrl = await fetchAudioBlob(cleaned, 1);
      if (blobUrl) {
        queueSentence(cleaned);
      } else {
        // Fall back to matching British female browser synthesis only when completely offline
        speakWithBrowser(cleaned, () => {
          setIsSpeaking(false);
        });
      }
    },
    [ttsEnabled, stopSpeaking, queueSentence, speakWithBrowser]
  );

  return {
    isListening,
    isSpeaking,
    isSupported,
    ttsEnabled,
    setTtsEnabled,
    startListening,
    stopListening,
    stopSpeaking,
    speak,
    queueSentence,
  };
}
