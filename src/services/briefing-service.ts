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
    gpuTemp?: number;
    newsCount: number;
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
 * Service to generate proactive and on-demand intelligent voice briefings.
 * Synthesizes time of day, live weather, pending tasks, hardware telemetry,
 * and top news into a seamless cybernetic voice report.
 */
export class BriefingService {
  private dbService?: DatabaseService;
  private webService?: WebService;
  private telemetryService?: TelemetryService;
  private pendingNotifications: BriefingNotification[] = [];

  constructor(
    dbService?: DatabaseService,
    webService?: WebService,
    telemetryService?: TelemetryService
  ) {
    this.dbService = dbService;
    this.webService = webService;
    this.telemetryService = telemetryService;
  }

  /**
   * Generates a live briefing for Eren.
   * @param type Briefing category ('morning' | 'evening' | 'general')
   * @param location Optional city name for weather (defaults to remembered city or London)
   */
  public async generateBriefing(
    type?: 'morning' | 'evening' | 'general',
    location?: string
  ): Promise<BriefingResult> {
    const now = new Date();
    const currentHour = now.getHours();

    const briefingType: 'morning' | 'evening' | 'general' =
      type || (currentHour < 12 ? 'morning' : currentHour >= 18 ? 'evening' : 'general');

    // 1. Time & Greeting
    const greeting = this.getGreeting(currentHour);
    const dateFormatted = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 2. Weather
    const weatherCity = location || this.getSavedCity() || 'London';
    const weatherData = await this.getWeatherSummary(weatherCity);

    // 3. To-Do Tasks
    const tasks = this.getPendingTasks();

    // 4. Hardware Telemetry
    const telemetrySummary = await this.getTelemetrySummary();

    // 5. News Headlines (Quick 2 items)
    const newsHeadlines = await this.getNewsSummary();

    // 6. Build Voice Text (Spoken by Edge TTS - pure conversational speech, no asterisks/markdown)
    const voiceSentences: string[] = [];
    voiceSentences.push(`${greeting}. It is ${timeFormatted} on ${dateFormatted}.`);

    if (weatherData) {
      voiceSentences.push(weatherData.spoken);
    }

    if (tasks.length > 0) {
      if (tasks.length === 1) {
        voiceSentences.push(`You have one pending item on your agenda: ${tasks[0]}.`);
      } else {
        const taskList = tasks.slice(0, 3).join(', and ');
        voiceSentences.push(
          `You have ${tasks.length} pending tasks on your agenda, including: ${taskList}.`
        );
      }
    } else {
      voiceSentences.push('Your to-do list is completely clear right now.');
    }

    if (newsHeadlines.length > 0) {
      voiceSentences.push(
        `In top news headlines today: ${newsHeadlines.slice(0, 2).map((n) => n.cleanTitle).join('. In other developments: ')}.`
      );
    }

    if (telemetrySummary?.spoken) {
      voiceSentences.push(telemetrySummary.spoken);
    }

    voiceSentences.push(
      'All cybernetic systems are operating at peak efficiency. Ready for your command, Eren.'
    );

    const voiceText = voiceSentences.join(' ');

    // 7. Build Display Text (Rich Markdown for UI Chat Bubble)
    const headerTitle =
      briefingType === 'morning'
        ? '☀️ Morning Briefing'
        : briefingType === 'evening'
        ? '🌙 Evening Briefing'
        : '🎙️ Zyra Intelligence Briefing';

    const displayLines: string[] = [
      `### ${headerTitle}`,
      `*${greeting} — ${timeFormatted} | ${dateFormatted}*`,
      '',
    ];

    if (weatherData) {
      displayLines.push(`**🌦️ Weather (${weatherCity})**`);
      displayLines.push(`• ${weatherData.display}`);
      displayLines.push('');
    }

    displayLines.push(`**📋 Agenda & Tasks**`);
    if (tasks.length > 0) {
      tasks.forEach((t) => displayLines.push(`• ${t}`));
    } else {
      displayLines.push(`• *No pending tasks. All clear.*`);
    }
    displayLines.push('');

    if (newsHeadlines.length > 0) {
      displayLines.push(`**🌐 Top World & Tech Headlines**`);
      newsHeadlines.slice(0, 3).forEach((n) => {
        displayLines.push(`• [${n.cleanTitle}](${n.url})`);
      });
      displayLines.push('');
    }

    if (telemetrySummary?.display) {
      displayLines.push(`**⚡ System & GPU Telemetry**`);
      displayLines.push(`• ${telemetrySummary.display}`);
      displayLines.push('');
    }

    displayLines.push(`> *${config.assistantName} Neural Engine standing by.*`);

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
        gpuTemp: telemetrySummary?.gpuTemp,
        newsCount: newsHeadlines.length,
      },
    };

    // Store in notification queue for proactive delivery
    this.pendingNotifications.push({
      id: resultId,
      type: briefingType,
      voiceText,
      displayText,
      createdAt: now.toISOString(),
      delivered: false,
    });

    // Keep queue at max 10
    if (this.pendingNotifications.length > 10) {
      this.pendingNotifications.shift();
    }

    logger.info(`Generated ${briefingType} voice briefing (id: ${resultId})`);
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

  private getGreeting(hour: number): string {
    const name = config.ownerName || 'Eren';
    if (hour >= 5 && hour < 12) return `Good morning, ${name}`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`;
    if (hour >= 17 && hour < 22) return `Good evening, ${name}`;
    return `Hello ${name}, working into the late hours`;
  }

  private getSavedCity(): string | undefined {
    if (!this.dbService) return undefined;
    try {
      const memories = this.dbService.getAllMemories();
      for (const [k, v] of Object.entries(memories)) {
        if (k.toLowerCase().includes('city') || k.toLowerCase().includes('location')) {
          return v;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private getPendingTasks(): string[] {
    if (!this.dbService) return [];
    try {
      const allTasks = this.dbService.getTasks(15);
      return allTasks.filter((t) => !t.completed).map((t) => t.title);
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
      const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(4000) });
      if (!geoRes.ok) return null;
      const geoData = (await geoRes.json()) as any;
      if (!geoData.results || geoData.results.length === 0) return null;

      const place = geoData.results[0];
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m`;
      const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(4000) });
      if (!weatherRes.ok) return null;
      const weatherData = (await weatherRes.json()) as any;
      if (!weatherData.current) return null;

      const temp = Math.round(weatherData.current.temperature_2m);
      const feels = Math.round(weatherData.current.apparent_temperature);
      const wind = Math.round(weatherData.current.wind_speed_10m);

      const display = `${temp}°C (feels like ${feels}°C) with wind at ${wind} km/h in ${place.name}, ${place.country || ''}`.trim();
      const spoken = `In ${place.name}, it is currently ${temp} degrees Celsius, feeling like ${feels}, with wind speeds around ${wind} kilometres per hour.`;
      return { display, spoken };
    } catch (err) {
      logger.warn(`Failed to fetch weather for briefing: ${err}`);
      return null;
    }
  }

  private async getTelemetrySummary(): Promise<{
    display: string;
    spoken: string;
    gpuTemp?: number;
  } | null> {
    if (!this.telemetryService) return null;
    try {
      const hw = await this.telemetryService.getHardwareTelemetry();
      const memPercent = hw.systemMemoryPercent;

      let gpuPart = '';
      let spokenGpu = '';
      let gpuTemp: number | undefined;

      if (hw.gpuName && !hw.gpuName.includes('Fallback')) {
        gpuTemp = hw.gpuTemperatureC;
        gpuPart = ` | GPU: ${hw.gpuName} (${hw.gpuTemperatureC}°C, ${hw.gpuVramUsedMB}MB VRAM)`;
        spokenGpu = `Your ${hw.gpuName} GPU is running at ${hw.gpuTemperatureC} degrees Celsius.`;
      }

      const display = `RAM: ${memPercent}% in use (${Math.round(hw.systemMemoryUsedMB / 1024)}GB / ${Math.round(hw.systemMemoryTotalMB / 1024)}GB)${gpuPart}`;
      const spoken = `System memory is at ${memPercent} percent utilization. ${spokenGpu}`.trim();

      return { display, spoken, gpuTemp };
    } catch (err) {
      logger.warn(`Failed to get telemetry for briefing: ${err}`);
      return null;
    }
  }

  private async getNewsSummary(): Promise<Array<{ cleanTitle: string; url: string }>> {
    if (!this.webService) return [];
    try {
      const results = await this.webService.search('top technology and world news today', 3);
      if (!results || results.length === 0) return [];

      return results.map((r: any) => {
        // Clean title for speech (remove pipe separators, site suffixes like - BBC News)
        const cleanTitle = (r.title || '').replace(/\s*[-|]\s*[^|]+$/, '').trim();
        return {
          cleanTitle,
          url: r.url,
        };
      });
    } catch (err) {
      logger.warn(`Failed to fetch news for briefing: ${err}`);
      return [];
    }
  }
}
