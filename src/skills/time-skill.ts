import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { logger } from '../config/logger.js';

// Fast in-memory timezone mappings for common cities and countries
const KNOWN_TIMEZONES: Record<string, { timezone: string; label: string }> = {
  tokyo: { timezone: 'Asia/Tokyo', label: 'Tokyo, Japan' },
  japan: { timezone: 'Asia/Tokyo', label: 'Japan' },
  london: { timezone: 'Europe/London', label: 'London, UK' },
  uk: { timezone: 'Europe/London', label: 'United Kingdom' },
  england: { timezone: 'Europe/London', label: 'England' },
  'new york': { timezone: 'America/New_York', label: 'New York, US' },
  nyc: { timezone: 'America/New_York', label: 'New York, US' },
  california: { timezone: 'America/Los_Angeles', label: 'California, US' },
  'los angeles': { timezone: 'America/Los_Angeles', label: 'Los Angeles, US' },
  la: { timezone: 'America/Los_Angeles', label: 'Los Angeles, US' },
  paris: { timezone: 'Europe/Paris', label: 'Paris, France' },
  france: { timezone: 'Europe/Paris', label: 'France' },
  berlin: { timezone: 'Europe/Berlin', label: 'Berlin, Germany' },
  germany: { timezone: 'Europe/Berlin', label: 'Germany' },
  sydney: { timezone: 'Australia/Sydney', label: 'Sydney, Australia' },
  australia: { timezone: 'Australia/Sydney', label: 'Australia' },
  india: { timezone: 'Asia/Kolkata', label: 'India' },
  delhi: { timezone: 'Asia/Kolkata', label: 'Delhi, India' },
  mumbai: { timezone: 'Asia/Kolkata', label: 'Mumbai, India' },
  dubai: { timezone: 'Asia/Dubai', label: 'Dubai, UAE' },
  uae: { timezone: 'Asia/Dubai', label: 'United Arab Emirates' },
  singapore: { timezone: 'Asia/Singapore', label: 'Singapore' },
  beijing: { timezone: 'Asia/Shanghai', label: 'Beijing, China' },
  china: { timezone: 'Asia/Shanghai', label: 'China' },
  toronto: { timezone: 'America/Toronto', label: 'Toronto, Canada' },
  canada: { timezone: 'America/Toronto', label: 'Canada' },
  moscow: { timezone: 'Europe/Moscow', label: 'Moscow, Russia' },
  russia: { timezone: 'Europe/Moscow', label: 'Russia' },
  cairo: { timezone: 'Africa/Cairo', label: 'Cairo, Egypt' },
  egypt: { timezone: 'Africa/Cairo', label: 'Egypt' },
  brazil: { timezone: 'America/Sao_Paulo', label: 'Brazil' },
  'sao paulo': { timezone: 'America/Sao_Paulo', label: 'São Paulo, Brazil' },
};

/**
 * Skill to return the current time and date locally or for any country/city worldwide.
 */
export class TimeSkill extends BaseSkill {
  name = 'time';
  description = 'Returns current time and/or date locally or in any country/city worldwide';
  patterns: IntentPattern[] = [
    { pattern: /what time is it/i, intent: 'get_time' },
    { pattern: /what('?s| is) the time/i, intent: 'get_time' },
    { pattern: /current time/i, intent: 'get_time' },
    { pattern: /what('?s| is) today('?s)? date/i, intent: 'get_date' },
    { pattern: /what day is it/i, intent: 'get_date' },
    { pattern: /time in (.+)/i, intent: 'get_time' },
  ];

  /**
   * Resolves a location string to an IANA timezone and formatted name.
   */
  private async resolveLocation(
    location: string
  ): Promise<{ timezone: string; label: string } | null> {
    const cleaned = location
      .toLowerCase()
      .trim()
      .replace(/[?!.,]+$/, '')
      .replace(/\s+(?:right now|now|today|please|currently)$/i, '')
      .trim();

    // 1. Check known timezones map
    if (KNOWN_TIMEZONES[cleaned]) {
      return KNOWN_TIMEZONES[cleaned];
    }

    // 2. Query free Open-Meteo Geocoding API for global coverage
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cleaned
      )}&count=1&language=en`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{
            name: string;
            country?: string;
            timezone?: string;
          }>;
        };

        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          if (item.timezone) {
            const label = item.country
              ? `${item.name}, ${item.country}`
              : item.name;
            return { timezone: item.timezone, label };
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Geocoding lookup failed for timezone: ${msg}`);
    }

    return null;
  }

  /**
   * Extracts location from parameters or raw input text.
   */
  private extractLocation(context: SkillContext): string | null {
    // 1. Check parameters
    if (context.intent?.parameters?.location) {
      return context.intent.parameters.location.trim();
    }

    // 2. Check raw string for "in <place>" or "for <place>"
    const raw = context.intent?.raw || '';
    const match = raw.match(/\b(?:in|for|at)\s+([a-zA-Z\s.-]+?)(?:\s+(?:right now|now|today))?[?!.,]?$/i);
    if (match && match[1]) {
      const loc = match[1].trim();
      // Ignore non-locations
      if (!['the morning', 'the afternoon', 'the evening', 'my area', 'here'].includes(loc.toLowerCase())) {
        return loc;
      }
    }

    return null;
  }

  /**
   * Executes the time request and returns formatted date/time.
   * @param context The skill context.
   * @returns The skill result with the time/date.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const now = new Date();
    const location = this.extractLocation(context);

    // If location requested, format for that timezone
    if (location) {
      const resolved = await this.resolveLocation(location);

      if (resolved) {
        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: resolved.timezone,
            hour: 'numeric',
            minute: 'numeric',
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZoneName: 'short',
          });

          const formatted = formatter.format(now);
          return this.success(`In ${resolved.label}, it's currently ${formatted}.`);
        } catch (err: unknown) {
          logger.warn(`Intl format error for timezone ${resolved.timezone}: ${err}`);
        }
      }

      // If we couldn't resolve the location
      return this.success(
        `I couldn't pinpoint the timezone for "${location}". However, your local time is ${new Intl.DateTimeFormat(
          'en-US',
          { hour: 'numeric', minute: 'numeric', weekday: 'long', month: 'long', day: 'numeric' }
        ).format(now)}.`
      );
    }

    // Local time fallback
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const response = `It's ${formatter.format(now)}.`;
    return this.success(response);
  }
}
