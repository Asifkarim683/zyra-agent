import { useState, useEffect, useRef, useCallback } from 'react';

// Declare SpeechRecognition interfaces for browsers
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const ZYRA_VOICE_ID = 'en-GB-SoniaNeural';

export function useVoice(onSpeechResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop any playing speech immediately (barge-in)
  const stopSpeaking = useCallback(() => {
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

  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled) return;

      // Clean text for speech: strip markdown, code, urls
      const cleaned = text
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[*#_~>]/g, '')
        .trim();

      if (!cleaned) return;

      stopSpeaking();
      setIsSpeaking(true);

      const audioUrl = `/api/v1/voice/tts?text=${encodeURIComponent(cleaned)}&voice=${encodeURIComponent(ZYRA_VOICE_ID)}`;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.warn('Neural TTS failed, falling back to browser synthesis.');
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(cleaned);
          utterance.rate = 1.0;
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(
            (v) =>
              v.name.includes('Natural') ||
              v.name.includes('Google UK English Female') ||
              v.name.includes('George') ||
              v.name.includes('Samantha')
          );
          if (preferred) utterance.voice = preferred;

          window.speechSynthesis.speak(utterance);
        } else {
          setIsSpeaking(false);
        }
      };

      audio.play().catch((err) => {
        console.warn('Audio play was prevented or failed:', err);
        setIsSpeaking(false);
      });
    },
    [ttsEnabled, stopSpeaking]
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
  };
}
