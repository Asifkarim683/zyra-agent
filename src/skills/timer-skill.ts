import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { logger } from '../config/logger.js';

interface ActiveTimer {
  id: string;
  label: string;
  durationSeconds: number;
  endTime: number;
  timeoutId: NodeJS.Timeout;
}

/**
 * Skill allowing Zyra to set, check, and cancel countdown timers.
 */
export class TimerSkill extends BaseSkill {
  name = 'timer';
  description = 'Sets, checks, and cancels countdown timers with real-time tracking';

  private activeTimers: Map<string, ActiveTimer> = new Map();

  patterns: IntentPattern[] = [
    {
      pattern: /^(?:set (?:a )?timer (?:for )?|start (?:a )?timer (?:for )?|timer (?:for )?)(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)(?: (?:for|called) (.*))?$/i,
      intent: 'set_timer',
      extractParams: (match) => ({
        amount: match[1],
        unit: match[2],
        label: match[3]?.trim() || '',
      }),
    },
    {
      pattern: /^(?:how much time is left on (?:my )?timer|timer status|check timer|time left on timer|timer)$/i,
      intent: 'check_timer',
    },
    {
      pattern: /^(?:cancel (?:my )?timer|stop (?:the )?timer|clear (?:my )?timer|delete timer)$/i,
      intent: 'cancel_timer',
    },
  ];

  /**
   * Parses time unit to total seconds.
   */
  private parseDuration(amountStr: string, unitStr: string): number {
    const amount = parseFloat(amountStr);
    const unit = unitStr.toLowerCase();

    if (unit.startsWith('sec')) {
      return Math.round(amount);
    }
    if (unit.startsWith('min')) {
      return Math.round(amount * 60);
    }
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return Math.round(amount * 3600);
    }
    return Math.round(amount * 60); // Default to minutes
  }

  /**
   * Formats seconds into human readable text.
   */
  private formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
    }

    return parts.join(' and ');
  }

  async execute(context: SkillContext): Promise<SkillResult> {
    const intent = context.intent.intent;

    // 1. SET TIMER
    if (intent === 'set_timer') {
      const amount = context.intent.parameters?.amount || '5';
      const unit = context.intent.parameters?.unit || 'minutes';
      const label = context.intent.parameters?.label || '';

      const totalSeconds = this.parseDuration(amount, unit);
      if (isNaN(totalSeconds) || totalSeconds <= 0) {
        return this.success('Please provide a valid timer duration.');
      }

      if (totalSeconds > 86400) {
        return this.success('Timers cannot exceed 24 hours.');
      }

      const timerId = `timer-${Date.now()}`;
      const endTime = Date.now() + totalSeconds * 1000;

      const timeoutId = setTimeout(() => {
        logger.info(`⏰ Timer expired: ${label || 'Countdown'} (${totalSeconds}s)`);
        this.activeTimers.delete(timerId);
      }, totalSeconds * 1000);

      this.activeTimers.set(timerId, {
        id: timerId,
        label: label || 'Timer',
        durationSeconds: totalSeconds,
        endTime,
        timeoutId,
      });

      const readableDuration = this.formatDuration(totalSeconds);
      const labelText = label ? ` for ${label}` : '';
      return this.success(`Timer set for ${readableDuration}${labelText}. I'll keep track of it.`);
    }

    // 2. CHECK TIMER
    if (intent === 'check_timer') {
      if (this.activeTimers.size === 0) {
        return this.success("You don't have any active timers running right now.");
      }

      const now = Date.now();
      const reports: string[] = [];

      for (const timer of this.activeTimers.values()) {
        const remainingMs = timer.endTime - now;
        if (remainingMs > 0) {
          const remainingSec = Math.ceil(remainingMs / 1000);
          const readable = this.formatDuration(remainingSec);
          const labelPrefix = timer.label && timer.label !== 'Timer' ? `${timer.label}: ` : '';
          reports.push(`${labelPrefix}${readable} remaining`);
        }
      }

      if (reports.length === 0) {
        return this.success('Your timer just finished!');
      }

      return this.success(`You have ${reports.join(', ')}.`);
    }

    // 3. CANCEL TIMER
    if (intent === 'cancel_timer') {
      if (this.activeTimers.size === 0) {
        return this.success("There are no active timers to cancel.");
      }

      const count = this.activeTimers.size;
      for (const timer of this.activeTimers.values()) {
        clearTimeout(timer.timeoutId);
      }
      this.activeTimers.clear();

      return this.success(
        count === 1
          ? 'Your timer has been cancelled.'
          : `Cancelled all ${count} active timers.`
      );
    }

    return this.success("I'm not sure what you'd like me to do with the timer.");
  }
}
