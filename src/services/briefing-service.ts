import { logger } from '../config/logger.js';
import { config } from '../config/index.js';
import type { DatabaseService } from './database.js';
import type { WebService } from './web-service.js';
import type { TelemetryService } from './telemetry-service.js';

export interface BriefingResult {
  id: string;
  type: 'morning' | 'evening' | 'general';
  displayText: string;
  voiceText: string;
  createdAt: string;
  metadata: {
    weather?: string;
    tasksCount: number;
  };
}

export interface BriefingNotification {
  id: string;
  type: 'morning' | 'evening' | 'general';
  voiceText: string;
  displayText: string;
  createdAt: string;
  delivered: boolean;
}

/**
 * Service to generate concise, focused voice briefings.
 * Keeps only essential intelligence: greeting, weather, and deduplicated tasks.
 */
export class BriefingService {
  private dbService?: DatabaseService;
  private pendingNotifications: BriefingNotification[] = [];

  constructor(
    dbService?: DatabaseService,
    _webService?: WebService,
    _telemetryService?: TelemetryService
  ) {
    this.dbService = dbService;
  }

  /**
   * Generates a clean, essential briefing for Eren.
   * @param type Briefing category ('morning' | 'evening' | 'general')
   * @param location Optional city name for weather (defaults to saved city or London)
   * @param forNotification If true, saves to notification queue for scheduled background delivery
   */
  public async generateBriefing(
    type?: 'morning' | 'evening' | 'general',
    location?: string,
    forNotification = false
  ): Promise<BriefingResult> {
    const now = new Date();
    const currentHour = now.getHours();

    const briefingType: 'morning' | 'evening' | 'general' =
      type || (currentHour < 12 ? 'morning' : currentHour >= 18 ? 'evening' : 'general');

    // 1. Time & Greeting (Dynamic contextual phrasing)
    const greetingObj = this.getGreeting(currentHour);
    const dateFormatted = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    const timeFormatted = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 2. Weather (fast & essential)
    const weatherCity = location || this.getSavedCity() || 'London';
    const weatherData = await this.getWeatherSummary(weatherCity);

    // 3. Deduplicated Tasks (maximum 3 unique items)
    const tasks = this.getPendingTasks();

    // 4. Dynamic Spoken Voice Text (Designed specifically for clean, natural British neural speech)
    const voiceParts: string[] = [];
    voiceParts.push(greetingObj.voice);

    if (weatherData) {
      voiceParts.push(weatherData.spoken);
    }

    voiceParts.push(this.formatSpokenTasks(tasks));
    voiceParts.push(this.getDynamicSignoff());

    const voiceText = voiceParts.join(' ');

    // 5. Clean, compact Markdown for UI
    const headerTitle =
      briefingType === 'morning'
        ? '☀️ Morning Briefing'
        : briefingType === 'evening'
        ? '🌙 Evening Briefing'
        : '🎙️ Daily Briefing';

    const displayLines: string[] = [
      `### ${headerTitle}`,
      `*${greetingObj.display} — ${timeFormatted} | ${dateFormatted}*`,
      '',
    ];

    if (weatherData) {
      displayLines.push(`• **Weather:** ${weatherData.display}`);
    }

    if (tasks.length > 0) {
      displayLines.push(`• **Agenda:** ${tasks.length} task${tasks.length > 1 ? 's' : ''} (${tasks.join(', ')})`);
    } else {
      displayLines.push(`• **Agenda:** *All clear for today*`);
    }

    const displayText = displayLines.join('\n');
    const resultId = `briefing-${Date.now()}`;

    const briefingResult: BriefingResult = {
      id: resultId,
      type: briefingType,
      displayText,
      voiceText,
      createdAt: now.toISOString(),
      metadata: {
        weather: weatherData?.display,
        tasksCount: tasks.length,
      },
    };

    // Only queue if explicitly generated for background scheduled notifications
    if (forNotification) {
      this.pendingNotifications.push({
        id: resultId,
        type: briefingType,
        voiceText,
        displayText,
        createdAt: now.toISOString(),
        delivered: false,
      });

      if (this.pendingNotifications.length > 5) {
        this.pendingNotifications.shift();
      }
    }

    logger.info(`Generated clean ${briefingType} briefing (id: ${resultId})`);
    return briefingResult;
  }

  /**
   * Retrieves pending proactive notifications.
   */
  public getPendingNotifications(): BriefingNotification[] {
    return this.pendingNotifications.filter((n) => !n.delivered);
  }

  /**
   * Marks a notification as delivered.
   */
  public markDelivered(id: string): void {
    const notif = this.pendingNotifications.find((n) => n.id === id);
    if (notif) {
      notif.delivered = true;
    }
  }

  private getGreeting(hour: number): { display: string; voice: string } {
    const name = config.ownerName || 'Eren';
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    if (hour >= 5 && hour < 12) {
      return {
        display: `Good morning, ${name}`,
        voice: pick([
          `Good morning, ${name}. Welcome back.`,
          `Good morning, ${name}. Here is your live status briefing.`,
          `Good morning, ${name}. Hope you've had a restful start to the day.`,
        ]),
      };
    }
    if (hour >= 12 && hour < 17) {
      return {
        display: `Good afternoon, ${name}`,
        voice: pick([
          `Good afternoon, ${name}. Here is your midday status check.`,
          `Good afternoon, ${name}. Hope your day is going smoothly.`,
          `Good afternoon, ${name}.`,
        ]),
      };
    }
    if (hour >= 17 && hour < 22) {
      return {
        display: `Good evening, ${name}`,
        voice: pick([
          `Good evening, ${name}. Here is your evening intelligence briefing.`,
          `Good evening, ${name}. Hope your day was productive.`,
          `Good evening, ${name}.`,
        ]),
      };
    }
    return {
      display: `Hello, ${name}`,
      voice: pick([
        `Hello, ${name}. Working into the late hours tonight?`,
        `Good evening, ${name}. Still at the console?`,
        `Hello, ${name}.`,
      ]),
    };
  }

  private formatSpokenTasks(tasks: string[]): string {
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    if (tasks.length === 0) {
      return pick([
        'Your agenda is completely clear today, with no pending tasks.',
        'All clear on your agenda for today.',
        'You have no pending tasks on your checklist.',
      ]);
    }
    if (tasks.length === 1) {
      return pick([
        `You have one task pending on your agenda: ${tasks[0]}.`,
        `On your agenda today, you have one pending item: ${tasks[0]}.`,
      ]);
    }
    return pick([
      `You have ${tasks.length} tasks on your agenda: ${tasks.join(', and ')}.`,
      `On your checklist, there are ${tasks.length} pending items: ${tasks.join(', and ')}.`,
    ]);
  }

  private getDynamicSignoff(): string {
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    return pick([
      'All neural systems are synchronized and standing by.',
      'I am standing by whenever you need me.',
      'Ready whenever you are.',
      'Standing by for your command.',
    ]);
  }

  private getSavedCity(): string | undefined {
    if (!this.dbService) return undefined;
    try {
      const memories = this.dbService.getAllMemories();
      if (memories['city']) return memories['city'];
      if (memories['location']) {
        return memories['location'].split(',')[0].trim();
      }
      for (const [k, v] of Object.entries(memories)) {
        if (k.toLowerCase().includes('city') || k.toLowerCase().includes('location')) {
          return v.split(',')[0].trim();
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Returns up to 3 distinct, deduplicated pending tasks.
   */
  private getPendingTasks(): string[] {
    if (!this.dbService) return [];
    try {
      const allTasks = this.dbService.getTasks(30);
      const unique: string[] = [];
      for (const t of allTasks) {
        if (!t.completed) {
          const title = t.title.trim();
          if (title && !unique.includes(title)) {
            unique.push(title);
          }
        }
      }
      return unique.slice(0, 3);
    } catch (err) {
      logger.warn(`Failed to read tasks for briefing: ${err}`);
      return [];
    }
  }

  private async getWeatherSummary(
    city: string
  ): Promise<{ display: string; spoken: string } | null> {
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=en`;
      let geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(3000) });
      if (!geoRes.ok) return null;
      let geoData = (await geoRes.json()) as any;
      if (!geoData.results || geoData.results.length === 0) {
        if (/shwar/i.test(city)) {
          const altCity = city.replace(/shwar/gi, 'swar');
          const altUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(altCity)}&count=1&language=en`;
          const altRes = await fetch(altUrl, { signal: AbortSignal.timeout(3000) });
          if (altRes.ok) {
            geoData = (await altRes.json()) as any;
          }
        }
      }
      if (!geoData.results || geoData.results.length === 0) return null;

      const place = geoData.results[0];
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code`;
      const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(3000) });
      if (!weatherRes.ok) return null;
      const weatherData = (await weatherRes.json()) as any;
      if (!weatherData.current) return null;

      const temp = Math.round(weatherData.current.temperature_2m);
      const code = weatherData.current.weather_code;
      const condition = this.getConditionName(code);

      const display = `${temp}°C, ${condition} in ${place.name}`;
      const spoken = `In ${place.name}, it is currently ${temp} degrees and ${condition}.`;
      return { display, spoken };
    } catch (err) {
      logger.warn(`Failed to fetch weather for briefing: ${err}`);
      return null;
    }
  }

  private getConditionName(code: number): string {
    if (code === 0) return 'clear skies';
    if (code === 1 || code === 2) return 'partly cloudy';
    if (code === 3) return 'overcast';
    if (code >= 45 && code <= 48) return 'foggy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'snowy';
    if (code >= 80 && code <= 82) return 'showers';
    if (code >= 95) return 'thunderstorms';
    return 'fair conditions';
  }
}
