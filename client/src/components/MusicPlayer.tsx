import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X,
  Music,
  Search,
  Radio,
  ExternalLink,
  Disc3,
  Sparkles,
} from 'lucide-react';
import type { MusicTrack } from '../types';

interface MusicPlayerProps {
  currentTrack: MusicTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: MusicTrack) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
}

const PRESET_STATIONS = [
  { name: 'Lofi Chill', query: 'lofi hip hop radio chill beats', platform: 'youtube' as const },
  { name: 'Synthwave Radio', query: 'synthwave chill radio', platform: 'youtube' as const },
  { name: 'Cyberpunk 2077', query: 'cyberpunk ambient music', platform: 'youtube' as const },
  { name: 'Coffee Shop Jazz', query: 'relaxing jazz cafe music', platform: 'youtube' as const },
  { name: 'Classical Focus', query: 'classical piano for focus and study', platform: 'youtube' as const },
];

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  currentTrack,
  isOpen,
  onClose,
  onSelectTrack,
  isPlaying,
  onTogglePlay,
  onStop,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPlatform, setSearchPlatform] = useState<'youtube' | 'spotify'>('youtube');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sync expanded state with modal isOpen prop
  useEffect(() => {
    if (isOpen) {
      setIsExpanded(true);
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/v1/music/search?q=${encodeURIComponent(query)}&platform=${searchPlatform}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tracks)) {
          setSearchResults(data.tracks);
        }
      }
    } catch (err) {
      console.error('Music search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const playStation = async (query: string, platform: 'youtube' | 'spotify') => {
    setIsSearching(true);
    try {
      const res = await fetch('/api/v1/music/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, platform }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.track) {
          onSelectTrack(data.track);
        }
      }
    } catch (err) {
      console.error('Failed to play station:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      {/* ── 1. Floating Docked Mini Player (Visible when track exists & not expanded) ── */}
      {currentTrack && !isExpanded && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3.5 bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-2.5 px-4 rounded-full transition-all duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]">
          {/* Animated Album Art / Disc */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-cyan-500/40 shadow-inner">
            {currentTrack.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`}
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-cyan-400">
                <Disc3 className={`w-6 h-6 ${isPlaying ? 'animate-spin' : ''}`} />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none rounded-full animate-pulse" />
            )}
          </div>

          {/* Track Metadata */}
          <div className="flex flex-col max-w-[180px] sm:max-w-[220px]">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  currentTrack.platform === 'spotify'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {currentTrack.platform}
              </span>
              <span className="text-xs font-semibold text-slate-100 truncate" title={currentTrack.title}>
                {currentTrack.title}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate">{currentTrack.artist}</span>
          </div>

          {/* Mini Controls */}
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800/80 pl-2.5">
            <button
              onClick={onTogglePlay}
              className="p-2 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => setIsExpanded(true)}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
              title="Expand Music Studio"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onStop}
              className="p-1.5 rounded-full hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
              title="Close Player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Full Inbuilt Music Studio Modal ── */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-950 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Music className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                    Zyra Music Studio
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      YouTube & Spotify
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Inbuilt background audio & video streaming</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition"
                  title="Minimize to Dock"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onClose();
                  }}
                  className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                  title="Close Studio"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Studio Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Active Player Display */}
              {currentTrack ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Now Streaming
                    </span>
                    <a
                      href={currentTrack.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                    >
                      Open in {currentTrack.platform === 'spotify' ? 'Spotify' : 'YouTube'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Embedded IFrame Player Container */}
                  <div className="relative w-full rounded-xl overflow-hidden bg-black/60 border border-slate-800 shadow-lg aspect-video max-h-[300px]">
                    {currentTrack.platform === 'youtube' ? (
                      <iframe
                        src={currentTrack.embedUrl}
                        title={currentTrack.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <iframe
                        src={currentTrack.embedUrl}
                        title={currentTrack.title}
                        className="w-full h-full border-0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Track Info Banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
                    <div className="flex items-center gap-3">
                      {currentTrack.thumbnail && (
                        <img
                          src={currentTrack.thumbnail}
                          alt={currentTrack.title}
                          className="w-11 h-11 rounded-lg object-cover border border-slate-700 shadow"
                        />
                      )}
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{currentTrack.title}</div>
                        <div className="text-xs text-slate-400">{currentTrack.artist}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        currentTrack.platform === 'spotify'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {currentTrack.platform}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 rounded-xl bg-slate-900/30 border border-dashed border-slate-800">
                  <Disc3 className="w-12 h-12 text-slate-600 mx-auto mb-2 animate-spin-slow" />
                  <p className="text-sm font-medium text-slate-300">No music currently playing</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Search a song below or pick one of the ambient stations
                  </p>
                </div>
              )}

              {/* Search Music Bar */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Search Track or Artist
                  </label>

                  {/* Platform Switcher */}
                  <div className="flex rounded-lg p-0.5 bg-slate-900 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setSearchPlatform('youtube')}
                      className={`px-2.5 py-1 rounded-md transition font-medium ${
                        searchPlatform === 'youtube'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchPlatform('spotify')}
                      className={`px-2.5 py-1 rounded-md transition font-medium ${
                        searchPlatform === 'spotify'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Spotify
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${searchPlatform === 'spotify' ? 'Spotify' : 'YouTube'} music...`}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    {isSearching ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Search
                  </button>
                </form>
              </div>

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Search Results
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {searchResults.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 transition group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {t.thumbnail ? (
                            <img src={t.thumbnail} alt={t.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          ) : (
                            <Music className="w-8 h-8 p-1.5 rounded bg-slate-800 text-slate-400 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-200 truncate group-hover:text-cyan-300">
                              {t.title}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{t.artist}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onSelectTrack(t);
                            setSearchResults([]);
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium flex items-center gap-1 transition flex-shrink-0"
                        >
                          <Play className="w-3 h-3" /> Play
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ambient Presets / Stations */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" /> Ambient Stations (One-Click)
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_STATIONS.map((station) => (
                    <button
                      key={station.name}
                      onClick={() => playStation(station.query, station.platform)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900/70 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/30 text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 text-cyan-400" />
                      {station.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Disc3 className="w-3.5 h-3.5 text-cyan-400" />
                Say <code className="text-cyan-300">"play [song] on youtube"</code> or{' '}
                <code className="text-emerald-300">"play [song] on spotify"</code>
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Dock Player
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
