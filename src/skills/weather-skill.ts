import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { logger } from '../config/logger.js';

const WMO_WEATHER_CODES: Record<number, string> = {
  0: 'clear skies',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'depositing rime fog',
  51: 'light drizzle',
  53: 'moderate drizzle',
  55: 'dense drizzle',
  61: 'slight rain',
  62: 'moderate rain',
  63: 'moderate rain',
  65: 'heavy rain',
  71: 'slight snowfall',
  73: 'moderate snowfall',
  75: 'heavy snowfall',
  77: 'snow grains',
  80: 'slight rain showers',
  81: 'moderate rain showers',
  82: 'violent rain showers',
  85: 'slight snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorms',
  96: 'thunderstorms with slight hail',
  99: 'thunderstorms with heavy hail',
};

/**
 * Skill to fetch live, real-time weather forecasts worldwide using Open-Meteo.
 */
export class WeatherSkill extends BaseSkill {
  name = 'weather';
  description = 'Provides live weather information for any city or location worldwide';
  patterns: IntentPattern[] = [
    { pattern: /^(?:what(?:'?s| is) the weather|how(?:'?s| is) the weather|weather)(?: in (.*))?$/i, intent: 'check_weather' },
    { pattern: /weather forecast(?: for| in) (.*)/i, intent: 'check_weather' },
  ];

  /**
   * Executes the weather skill.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    let location = context.intent?.parameters?.location?.trim();

    if (!location) {
      // Try to parse from raw text
      const raw = context.intent?.raw || '';
      const match = raw.match(/\b(?:in|for|at)\s+([a-zA-Z\s.-]+?)(?:\s+(?:right now|today|tomorrow))?[?!.,]?$/i);
      if (match && match[1]) {
        location = match[1].trim();
      }
    }

    if (!location) {
      return this.success('Which city or country would you like the weather for?');
    }

    // Clean location
    const cleanedLocation = location.replace(/[?!.,]+$/, '').replace(/\s+(?:right now|today|currently)$/i, '').trim();

    logger.info(`Fetching live weather for: "${cleanedLocation}"`);

    try {
      // 1. Geocode location
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cleanedLocation
      )}&count=1&language=en`;
      const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
      if (!geoRes.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const geoData = (await geoRes.json()) as {
        results?: Array<{
          name: string;
          country?: string;
          latitude: number;
          longitude: number;
        }>;
      };

      if (!geoData.results || geoData.results.length === 0) {
        return this.success(`I couldn't find a location matching "${cleanedLocation}". Please check the spelling and try again.`);
      }

      const place = geoData.results[0];
      const placeLabel = place.country ? `${place.name}, ${place.country}` : place.name;

      // 2. Fetch current weather from Open-Meteo
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`;
      const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(5000) });
      if (!weatherRes.ok) {
        throw new Error('Weather data service unavailable');
      }

      const weatherData = (await weatherRes.json()) as {
        current?: {
          temperature_2m: number;
          apparent_temperature: number;
          relative_humidity_2m: number;
          weather_code: number;
          wind_speed_10m: number;
        };
      };

      if (!weatherData.current) {
        return this.success(`I was unable to retrieve the latest weather data for ${placeLabel}.`);
      }

      const {
        temperature_2m,
        apparent_temperature,
        relative_humidity_2m,
        weather_code,
        wind_speed_10m,
      } = weatherData.current;

      const condition = WMO_WEATHER_CODES[weather_code] || 'fair conditions';

      const response = `In ${placeLabel}, it's currently ${Math.round(temperature_2m)}°C (feels like ${Math.round(
        apparent_temperature
      )}°C) with ${condition}, ${relative_humidity_2m}% humidity, and wind at ${Math.round(wind_speed_10m)} km/h.`;

      return this.success(response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Error fetching weather for ${cleanedLocation}: ${msg}`);
      return this.success(`I had a little trouble reaching the weather service right now. Please try again in a moment.`);
    }
  }
}
