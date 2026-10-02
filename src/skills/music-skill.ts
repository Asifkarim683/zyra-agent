import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import type { MusicService } from '../services/music-service.js';

/**
 * Skill for controlling the inbuilt music player with YouTube and Spotify API support.
 */
export class MusicSkill extends BaseSkill {
  name = 'music';
  description = 'Plays and controls music via inbuilt YouTube and Spotify player';
  private musicService?: MusicService;

  constructor(musicService?: MusicService) {
    super();
    this.musicService = musicService;
  }

  patterns: IntentPattern[] = [
    {
      pattern: /^(?:play (?:some |a )?music|play (?:a )?song|play)\s*(.*)$/i,
      intent: 'play_music',
      extractParams: (m) => ({ query: m[1]?.trim() || '' }),
    },
    {
      pattern: /^(?:pause music|pause the music|pause song|pause track)$/i,
      intent: 'pause_music',
    },
    {
      pattern: /^(?:resume music|resume the music|resume song|resume track|unpause music)$/i,
      intent: 'resume_music',
    },
    {
      pattern: /^(?:stop music|stop the music|stop song|stop playback)$/i,
      intent: 'stop_music',
    },
    {
      pattern: /^(?:next song|next track|skip song|skip track)$/i,
      intent: 'next_music',
    },
  ];

  async execute(context: SkillContext): Promise<SkillResult> {
    const intent = context.intent.intent;
    const query = context.intent.parameters?.query;
    const platformParam = (context.intent.parameters?.platform as 'youtube' | 'spotify') || undefined;

    if (!this.musicService) {
      const display = query && !query.match(/^(some |a )?(music|song)$/i) ? query.trim() : 'music';
      return this.success(`Now playing: ${display}.`);
    }

    if (intent === 'pause_music') {
      const state = this.musicService.control('pause');
      return {
        response: 'Music playback paused.',
        action: 'music_control',
        data: { music: { action: 'pause', state } },
        speak: true,
      };
    }

    if (intent === 'resume_music') {
      const state = this.musicService.control('resume');
      const track = state.currentTrack;
      return {
        response: track ? `Resumed playing "${track.title}".` : 'No track is currently queued to resume.',
        action: 'music_control',
        data: { music: { action: 'resume', state } },
        speak: true,
      };
    }

    if (intent === 'stop_music') {
      const state = this.musicService.control('stop');
      return {
        response: 'Stopped music playback.',
        action: 'music_control',
        data: { music: { action: 'stop', state } },
        speak: true,
      };
    }

    if (intent === 'next_music') {
      const state = this.musicService.control('next');
      const track = state.currentTrack;
      return {
        response: track ? `Playing next track: "${track.title}".` : 'No additional tracks in the queue.',
        action: 'music_control',
        data: { music: { action: 'next', state } },
        speak: true,
      };
    }

    // Default: play_music
    const isGeneric = !query || /^(?:some |a )?(?:music|song)$/i.test(query.trim());
    const display = isGeneric ? 'music' : query.trim();
    const track = await this.musicService.play(display, platformParam);
    const platformName = track.platform === 'spotify' ? 'Spotify' : 'YouTube';

    const responseText = isGeneric
      ? `Playing music — "${track.title}" by ${track.artist} on ${platformName}.`
      : `Now playing: ${display} — "${track.title}" by ${track.artist} on ${platformName}.`;

    return {
      response: responseText,
      action: 'music_play',
      data: {
        music: {
          action: 'play',
          track,
          state: this.musicService.getState(),
        },
      },
      speak: true,
    };
  }
}
