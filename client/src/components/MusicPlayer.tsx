import React, { useEffect, useRef } from 'react';
import type { MusicTrack } from '../types';

interface MusicPlayerProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectTrack?: (track: MusicTrack) => void;
  onTogglePlay?: () => void;
  onStop?: () => void;
}

/**
 * Invisible Background Audio Streamer
 * Plays audio directly through the browser without cluttering the screen or rendering modal overlays.
 */
export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  currentTrack,
  isPlaying,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync YouTube player play/pause state via postMessage commands
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      if (isPlaying) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } else {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      }
    } catch {
      // Ignore cross-origin warnings before player initializes
    }
  }, [isPlaying]);

  if (!currentTrack) return null;

  // Stream URL: use audioFallbackUrl if present (e.g. for Spotify tracks to stream smoothly in background)
  const activeStreamUrl = currentTrack.audioFallbackUrl || currentTrack.embedUrl;

  return (
    <div
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '320px',
        height: '200px',
        opacity: 0.001,
        pointerEvents: 'none',
        zIndex: -9999,
      }}
      aria-hidden="true"
    >
      <iframe
        ref={iframeRef}
        key={currentTrack.id}
        src={activeStreamUrl}
        title={currentTrack.title}
        width="320"
        height="200"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        style={{ border: 0 }}
      />
    </div>
  );
};
