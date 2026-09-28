import { useState, useEffect, useRef, useCallback } from 'react';

// Declare SpeechRecognition interfaces for browsers
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useVoice(onSpeechResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

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
        // Barge-in: interrupt any ongoing TTS when user starts speaking
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
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
  }, [onSpeechResult]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        // Stop any running speech synthesis immediately on mic trigger
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || !window.speechSynthesis) return;

      // Clean text for speech: remove code blocks, timestamps, urls
      const cleaned = text
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      if (!cleaned) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Zira') ||
          v.name.includes('Jenny')
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled]
  );

  return {
    isListening,
    isSupported,
    ttsEnabled,
    setTtsEnabled,
    startListening,
    stopListening,
    speak,
  };
}
