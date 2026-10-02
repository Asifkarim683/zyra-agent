import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import type { LLMService } from './llm/llm-service.js';

export interface InterpretedFact {
  key: string;
  value: string;
  category: 'user_profile' | 'preference' | 'personal_detail' | 'work' | 'general';
  secondaryMemories?: Record<string, string>;
  confirmation: string;
  rawInput: string;
}

// Normalized Country Dictionary
const KNOWN_COUNTRIES: Record<string, string> = {
  india: 'India',
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  britain: 'United Kingdom',
  england: 'England',
  scotland: 'Scotland',
  wales: 'Wales',
  usa: 'USA',
  us: 'USA',
  'united states': 'USA',
  america: 'USA',
  canada: 'Canada',
  australia: 'Australia',
  germany: 'Germany',
  france: 'France',
  japan: 'Japan',
  china: 'China',
  spain: 'Spain',
  italy: 'Italy',
  russia: 'Russia',
  brazil: 'Brazil',
  singapore: 'Singapore',
  uae: 'United Arab Emirates',
  'united arab emirates': 'United Arab Emirates',
  dubai: 'United Arab Emirates',
  netherlands: 'Netherlands',
  switzerland: 'Switzerland',
  sweden: 'Sweden',
  norway: 'Norway',
  denmark: 'Denmark',
  ireland: 'Ireland',
  'new zealand': 'New Zealand',
};

// Normalized States & Regions (including Indian states, US states, etc.)
const KNOWN_STATES: Record<string, string> = {
  odisha: 'Odisha',
  orissa: 'Odisha',
  maharashtra: 'Maharashtra',
  karnataka: 'Karnataka',
  'tamil nadu': 'Tamil Nadu',
  'west bengal': 'West Bengal',
  gujarat: 'Gujarat',
  rajasthan: 'Rajasthan',
  'uttar pradesh': 'Uttar Pradesh',
  up: 'Uttar Pradesh',
  'madhya pradesh': 'Madhya Pradesh',
  mp: 'Madhya Pradesh',
  bihar: 'Bihar',
  'andhra pradesh': 'Andhra Pradesh',
  telangana: 'Telangana',
  kerala: 'Kerala',
  punjab: 'Punjab',
  haryana: 'Haryana',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  assam: 'Assam',
  jharkhand: 'Jharkhand',
  chhattisgarh: 'Chhattisgarh',
  goa: 'Goa',
  uttarakhand: 'Uttarakhand',
  'himachal pradesh': 'Himachal Pradesh',
  'jammu and kashmir': 'Jammu and Kashmir',
  california: 'California',
  'new york': 'New York',
  texas: 'Texas',
  washington: 'Washington',
  florida: 'Florida',
  illinois: 'Illinois',
  massachusetts: 'Massachusetts',
  ontario: 'Ontario',
  quebec: 'Quebec',
  'british columbia': 'British Columbia',
};

// Known major world and Indian cities
const KNOWN_CITIES: Record<string, { city: string; state?: string; country?: string }> = {
  bhubaneshwar: { city: 'Bhubaneshwar', state: 'Odisha', country: 'India' },
  bhubaneswar: { city: 'Bhubaneshwar', state: 'Odisha', country: 'India' },
  cuttack: { city: 'Cuttack', state: 'Odisha', country: 'India' },
  puri: { city: 'Puri', state: 'Odisha', country: 'India' },
  rourkela: { city: 'Rourkela', state: 'Odisha', country: 'India' },
  berhampur: { city: 'Berhampur', state: 'Odisha', country: 'India' },
  sambalpur: { city: 'Sambalpur', state: 'Odisha', country: 'India' },
  mumbai: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
  bombay: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
  pune: { city: 'Pune', state: 'Maharashtra', country: 'India' },
  bangalore: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
  bengaluru: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
  hyderabad: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
  chennai: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
  madras: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
  kolkata: { city: 'Kolkata', state: 'West Bengal', country: 'India' },
  calcutta: { city: 'Kolkata', state: 'West Bengal', country: 'India' },
  delhi: { city: 'Delhi', state: 'Delhi', country: 'India' },
  'new delhi': { city: 'New Delhi', state: 'Delhi', country: 'India' },
  noida: { city: 'Noida', state: 'Uttar Pradesh', country: 'India' },
  gurgaon: { city: 'Gurgaon', state: 'Haryana', country: 'India' },
  gurugram: { city: 'Gurgaon', state: 'Haryana', country: 'India' },
  jaipur: { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
  ahmedabad: { city: 'Ahmedabad', state: 'Gujarat', country: 'India' },
  surat: { city: 'Surat', state: 'Gujarat', country: 'India' },
  lucknow: { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India' },
  chandigarh: { city: 'Chandigarh', country: 'India' },
  kochi: { city: 'Kochi', state: 'Kerala', country: 'India' },
  thiruvananthapuram: { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India' },
  london: { city: 'London', country: 'United Kingdom' },
  manchester: { city: 'Manchester', country: 'United Kingdom' },
  birmingham: { city: 'Birmingham', country: 'United Kingdom' },
  edinburgh: { city: 'Edinburgh', country: 'United Kingdom' },
  'new york': { city: 'New York', state: 'New York', country: 'USA' },
  'new york city': { city: 'New York', state: 'New York', country: 'USA' },
  nyc: { city: 'New York', state: 'New York', country: 'USA' },
  'san francisco': { city: 'San Francisco', state: 'California', country: 'USA' },
  sf: { city: 'San Francisco', state: 'California', country: 'USA' },
  seattle: { city: 'Seattle', state: 'Washington', country: 'USA' },
  los_angeles: { city: 'Los Angeles', state: 'California', country: 'USA' },
  'los angeles': { city: 'Los Angeles', state: 'California', country: 'USA' },
  chicago: { city: 'Chicago', state: 'Illinois', country: 'USA' },
  austin: { city: 'Austin', state: 'Texas', country: 'USA' },
  boston: { city: 'Boston', state: 'Massachusetts', country: 'USA' },
  toronto: { city: 'Toronto', state: 'Ontario', country: 'Canada' },
  vancouver: { city: 'Vancouver', state: 'British Columbia', country: 'Canada' },
  tokyo: { city: 'Tokyo', country: 'Japan' },
  kyoto: { city: 'Kyoto', country: 'Japan' },
  paris: { city: 'Paris', country: 'France' },
  berlin: { city: 'Berlin', country: 'Germany' },
  sydney: { city: 'Sydney', country: 'Australia' },
  melbourne: { city: 'Melbourne', country: 'Australia' },
  singapore: { city: 'Singapore', country: 'Singapore' },
  dubai: { city: 'Dubai', country: 'United Arab Emirates' },
  amsterdam: { city: 'Amsterdam', country: 'Netherlands' },
};

/**
 * Intelligent Fact Interpreter for Zyra.
 * Transforms natural conversational statements into structured keys, values,
 * secondary metadata (like city/country), and articulate British persona confirmations.
 */
export class FactInterpreter {
  /**
   * Interprets a raw user fact utterance.
   *
   * @param rawFact The uncleaned input string from the user.
   * @param ownerName The name of the user (e.g. Eren).
   * @param llmService Optional LLM service for freeform / ambiguous fallback.
   */
  public static async interpret(
    rawFact: string,
    ownerName: string = config.ownerName || 'Eren',
    llmService?: LLMService
  ): Promise<InterpretedFact> {
    const cleaned = this.cleanFactString(rawFact);

    // 1. Try Deterministic Entity Extractors
    const deterministic = this.extractDeterministic(cleaned, ownerName);
    if (deterministic) {
      return deterministic;
    }

    // 2. Try LLM semantic extraction if available and text is complex
    if (llmService) {
      try {
        const llmResult = await this.extractWithLLM(cleaned, ownerName, llmService);
        if (llmResult) {
          return llmResult;
        }
      } catch (err) {
        logger.warn(`FactInterpreter LLM extraction fallback failed: ${err}`);
      }
    }

    // 3. Fallback: Clean Rule-Based Memory Builder (Never slicing or generating broken grammar)
    return this.buildFallbackFact(cleaned, ownerName);
  }

  public static interpretSync(
    rawFact: string,
    ownerName: string = config.ownerName || 'Eren'
  ): InterpretedFact {
    const cleaned = this.cleanFactString(rawFact);
    const deterministic = this.extractDeterministic(cleaned, ownerName);
    if (deterministic) {
      return deterministic;
    }
    return this.buildFallbackFact(cleaned, ownerName);
  }

  /**
   * Cleans initial punctuation and prefixes like "remember that", "remember", etc.
   */
  private static cleanFactString(raw: string): string {
    return raw
      .replace(/[?!.]+$/, '')
      .replace(/^(?:remember that|remember|don't forget that|don't forget|keep in mind that|keep in mind|save that|note that|note)\s+/i, '')
      .trim();
  }

  /**
   * Deterministic pattern and entity matching.
   */
  private static extractDeterministic(text: string, owner: string): InterpretedFact | null {
    // -------------------------------------------------------------------------
    // 1. LOCATION / RESIDENCE / ORIGIN
    // Matches: "I'm from Odisha Bhubaneshwar India", "Im from London", "I live in Berlin",
    //          "my location is New York", "my city is Bhubaneshwar", "I am based in Paris"
    // -------------------------------------------------------------------------
    const locPattern =
      /^(?:i(?:'m| am|m)\s+(?:from|in|at)|i live(?:\s+(?:in|at))?|i stay(?:\s+(?:in|at))?|i am based(?:\s+(?:in|at))?|i'm based(?:\s+(?:in|at))?|im based(?:\s+(?:in|at))?|my home is|my hometown is|my origin is|my location is|my city is)\s*(.+)$/i;
    const locExplicit = /^(?:location|city|country|hometown)\s+is\s+(.+)$/i;

    let locMatch = text.match(locPattern) || text.match(locExplicit);
    if (locMatch) {
      let locText = locMatch[1].trim();
      const parsedLoc = this.parseLocationText(locText);

      return {
        key: 'location',
        value: parsedLoc.fullLocation,
        category: 'user_profile',
        secondaryMemories: parsedLoc.secondary,
        confirmation: `Understood, ${owner}. I've noted that you're from ${parsedLoc.fullLocation}, and I'll keep that in mind for your local weather and briefings.`,
        rawInput: text,
      };
    }

    // -------------------------------------------------------------------------
    // 2. PROFESSION / WORKPLACE / CAREER
    // Matches: "I'm a software engineer", "I work as an AI researcher at Google",
    //          "I work at OpenAI", "my profession is doctor", "my job is architect"
    // -------------------------------------------------------------------------
    const workAtPattern = /^(?:i work (?:at|for)|employed at)\s+([a-zA-Z0-9\s.,&]+)$/i;
    const workAtMatch = text.match(workAtPattern);
    if (workAtMatch) {
      const company = workAtMatch[1].trim();
      return {
        key: 'workplace',
        value: company,
        category: 'work',
        secondaryMemories: { company },
        confirmation: `Noted, ${owner}. I'll remember that you work at ${company}.`,
        rawInput: text,
      };
    }

    const jobPattern =
      /^(?:i(?:'m| am|m)\s+(?:an?|the)|i work as|my profession is|my job is|my role is|my title is)\s*([a-zA-Z0-9\s.,&]+)$/i;
    const jobMatch = text.match(jobPattern);
    if (jobMatch) {
      const jobString = jobMatch[1].trim();
      // Check if includes "at [company]"
      const atSplit = jobString.match(/^(.*?)\s+(?:at|for|with)\s+([a-zA-Z0-9\s.,&]+)$/i);
      if (atSplit) {
        const role = this.capitalizeWords(atSplit[1].trim());
        const company = atSplit[2].trim();
        return {
          key: 'profession',
          value: `${role} at ${company}`,
          category: 'work',
          secondaryMemories: { role, company },
          confirmation: `Understood, ${owner}. I've noted that you work as a ${role} at ${company}.`,
          rawInput: text,
        };
      }

      const role = this.capitalizeWords(jobString);
      return {
        key: 'profession',
        value: role,
        category: 'work',
        secondaryMemories: { role },
        confirmation: `Understood, ${owner}. I'll remember that you work as a ${role}.`,
        rawInput: text,
      };
    }

    // -------------------------------------------------------------------------
    // 3. FAVORITES & PREFERENCES
    // Matches: "my favorite food is biryani", "my favourite color is green",
    //          "I prefer dark mode", "I love playing tennis", "I like black coffee"
    // -------------------------------------------------------------------------
    const favPattern = /^my (?:favorite|favourite)\s+([a-zA-Z\s]+?)\s+is\s+(.+)$/i;
    const favMatch = text.match(favPattern);
    if (favMatch) {
      const item = favMatch[1].trim().toLowerCase();
      const value = favMatch[2].trim();
      const key = `favorite_${item.replace(/[^a-z0-9]+/g, '_')}`;
      return {
        key,
        value,
        category: 'preference',
        confirmation: `Saved, ${owner}. I'll remember that your favorite ${item} is ${value}.`,
        rawInput: text,
      };
    }

    const preferPattern = /^(?:i prefer|my preference is for)\s+(.+)$/i;
    const preferMatch = text.match(preferPattern);
    if (preferMatch) {
      const val = preferMatch[1].trim();
      let key = 'preference';
      if (/dark mode|light mode/i.test(val)) key = 'preference_theme';
      else if (/coffee|tea/i.test(val)) key = 'preference_beverage';
      return {
        key,
        value: val,
        category: 'preference',
        confirmation: `Noted, ${owner}. I've recorded your preference for ${val}.`,
        rawInput: text,
      };
    }

    const lovePattern = /^(?:i love|i really like|i enjoy)\s+(.+)$/i;
    const loveMatch = text.match(lovePattern);
    if (loveMatch) {
      const val = loveMatch[1].trim();
      return {
        key: `interest_${val.slice(0, 16).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        value: val,
        category: 'preference',
        confirmation: `Got it, ${owner}. I'll remember that you love ${val}.`,
        rawInput: text,
      };
    }

    // -------------------------------------------------------------------------
    // 4. PERSONAL ATTRIBUTES & HEALTH
    // Matches: "my birthday is August 15", "I'm allergic to peanuts", "my email is ..."
    // -------------------------------------------------------------------------
    const bdayPattern = /^(?:my birthday|my bday)\s+(?:is|on)\s+(?:the\s+)?(.+)$/i;
    const bdayMatch = text.match(bdayPattern);
    if (bdayMatch) {
      const val = bdayMatch[1].trim();
      return {
        key: 'birthday',
        value: val,
        category: 'personal_detail',
        confirmation: `Got it, ${owner}. I've noted that your birthday is ${val}.`,
        rawInput: text,
      };
    }

    const allergyPattern = /^(?:i(?:'m| am|m)\s+allergic to|my allergy is)\s+(.+)$/i;
    const allergyMatch = text.match(allergyPattern);
    if (allergyMatch) {
      const val = allergyMatch[1].trim();
      return {
        key: 'allergy',
        value: val,
        category: 'personal_detail',
        confirmation: `Crucial note saved, ${owner}. I will remember that you are allergic to ${val}.`,
        rawInput: text,
      };
    }

    const contactPattern = /^my (email|phone|phone number|mobile|website)\s+is\s+(.+)$/i;
    const contactMatch = text.match(contactPattern);
    if (contactMatch) {
      const field = contactMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      const val = contactMatch[2].trim();
      return {
        key: field,
        value: val,
        category: 'personal_detail',
        confirmation: `Saved, ${owner}. I've recorded your ${field.replace(/_/g, ' ')} as ${val}.`,
        rawInput: text,
      };
    }

    // -------------------------------------------------------------------------
    // 5. PETS & RELATIONSHIPS
    // Matches: "my cat's name is Luna", "my dog is named Rex", "my wife is Sarah"
    // -------------------------------------------------------------------------
    const petPattern = /^my (dog|cat|pet)(?:'s)?(?:\s+name)?\s+(?:is|named)\s+(.+)$/i;
    const petMatch = text.match(petPattern);
    if (petMatch) {
      const petType = petMatch[1].toLowerCase();
      const petName = petMatch[2].trim();
      return {
        key: `${petType}_name`,
        value: petName,
        category: 'personal_detail',
        confirmation: `Noted, ${owner}. I'll remember that your ${petType}'s name is ${petName}.`,
        rawInput: text,
      };
    }

    const relPattern = /^my (wife|husband|partner|brother|sister|son|daughter|mother|father)(?:'s)?(?:\s+name)?\s+is\s+(.+)$/i;
    const relMatch = text.match(relPattern);
    if (relMatch) {
      const rel = relMatch[1].toLowerCase();
      const name = relMatch[2].trim();
      return {
        key: `${rel}_name`,
        value: name,
        category: 'personal_detail',
        confirmation: `Noted, ${owner}. I'll remember that your ${rel}'s name is ${name}.`,
        rawInput: text,
      };
    }

    // -------------------------------------------------------------------------
    // 6. GENERAL "MY [PROPERTY] IS [VALUE]"
    // Matches: "my car is a Honda Civic", "my operating system is Windows 11"
    // -------------------------------------------------------------------------
    const myPropPattern = /^my\s+([a-zA-Z0-9\s_-]+?)\s+is\s+(.+)$/i;
    const myPropMatch = text.match(myPropPattern);
    if (myPropMatch) {
      const rawProp = myPropMatch[1].trim();
      const val = myPropMatch[2].trim();
      const key = rawProp.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      return {
        key,
        value: val,
        category: 'general',
        confirmation: `Saved, ${owner}. I'll remember that your ${rawProp} is ${val}.`,
        rawInput: text,
      };
    }

    // -------------------------------------------------------------------------
    // 7. "I HAVE / DRIVE / USE / SPEAK ..."
    // Matches: "I drive a Tesla Model 3", "I speak English and Japanese"
    // -------------------------------------------------------------------------
    const iVerbPattern = /^i\s+(drive|speak|use|own|play|study)\s+(.+)$/i;
    const iVerbMatch = text.match(iVerbPattern);
    if (iVerbMatch) {
      const verb = iVerbMatch[1].toLowerCase();
      const val = iVerbMatch[2].trim();
      let key = verb;
      if (verb === 'drive' || verb === 'own') key = 'vehicle';
      if (verb === 'speak') key = 'languages';
      return {
        key,
        value: val,
        category: 'general',
        confirmation: `Understood, ${owner}. I'll remember that you ${verb} ${val}.`,
        rawInput: text,
      };
    }

    return null;
  }

  /**
   * Intelligently parses geographic location strings into City, State, Country.
   * e.g. "Odisha Bhubaneshwar India" -> City: Bhubaneshwar, State: Odisha, Country: India
   *      "London UK" -> City: London, Country: United Kingdom
   */
  public static parseLocationText(rawLoc: string): {
    fullLocation: string;
    secondary: Record<string, string>;
  } {
    // Strip punctuation and normalize separators
    const cleaned = rawLoc.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = cleaned.split(' ').map((t) => t.trim()).filter(Boolean);

    let foundCity: string | undefined;
    let foundState: string | undefined;
    let foundCountry: string | undefined;

    // Check multi-word known phrases first (e.g. "New York", "Tamil Nadu", "United Kingdom")
    const lowerJoined = cleaned.toLowerCase();

    for (const [stateKey, stateVal] of Object.entries(KNOWN_STATES)) {
      if (new RegExp(`\\b${stateKey}\\b`, 'i').test(lowerJoined)) {
        foundState = stateVal;
        break;
      }
    }

    for (const [countryKey, countryVal] of Object.entries(KNOWN_COUNTRIES)) {
      if (new RegExp(`\\b${countryKey}\\b`, 'i').test(lowerJoined)) {
        foundCountry = countryVal;
        break;
      }
    }

    for (const [cityKey, cityData] of Object.entries(KNOWN_CITIES)) {
      if (new RegExp(`\\b${cityKey}\\b`, 'i').test(lowerJoined)) {
        foundCity = cityData.city;
        if (!foundState && cityData.state) foundState = cityData.state;
        if (!foundCountry && cityData.country) foundCountry = cityData.country;
        break;
      }
    }

    // If city wasn't explicitly in known city dictionary, inspect tokens
    if (!foundCity && tokens.length > 0) {
      const remainingTokens = tokens.filter((tok) => {
        const lower = tok.toLowerCase();
        if (foundCountry && (lower === foundCountry.toLowerCase() || KNOWN_COUNTRIES[lower])) return false;
        if (foundState && (lower === foundState.toLowerCase() || KNOWN_STATES[lower])) return false;
        return true;
      });

      if (remainingTokens.length > 0) {
        foundCity = this.capitalizeWords(remainingTokens.join(' '));
      }
    }

    // Build standardized formatted location
    const parts: string[] = [];
    if (foundCity) parts.push(foundCity);
    if (foundState && (!foundCity || foundCity.toLowerCase() !== foundState.toLowerCase())) {
      parts.push(foundState);
    }
    if (foundCountry) parts.push(foundCountry);

    const fullLocation = parts.length > 0 ? parts.join(', ') : this.capitalizeWords(cleaned);

    const secondary: Record<string, string> = {};
    if (foundCity) secondary['city'] = foundCity;
    if (foundState) secondary['state'] = foundState;
    if (foundCountry) secondary['country'] = foundCountry;

    return { fullLocation, secondary };
  }

  /**
   * Fast rule-based builder for freeform statements that ensures clean grammar and keys.
   */
  private static buildFallbackFact(text: string, owner: string): InterpretedFact {
    let clean = text.replace(/^that\s+/i, '').trim();

    // Generate a clean slug from meaningful keywords (filter filler words)
    const stopWords = new Set(['i', 'am', 'is', 'are', 'was', 'were', 'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'at', 'my', 'that', 'this']);
    const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w && !stopWords.has(w));
    const slug = words.slice(0, 3).join('_') || 'custom_fact';

    // Format natural British confirmation
    const confirmation = `Understood, ${owner}. I've saved that ${clean}.`;

    return {
      key: slug,
      value: clean,
      category: 'general',
      confirmation,
      rawInput: text,
    };
  }

  /**
   * LLM fallback for ambiguous or highly complex input.
   */
  private static async extractWithLLM(
    text: string,
    owner: string,
    llmService: LLMService
  ): Promise<InterpretedFact | null> {
    const prompt = `You are an entity interpreter for ${owner}'s AI assistant Zyra.
Extract the key personal fact from this statement: "${text}".
Return a valid JSON object ONLY with no surrounding explanation:
{
  "key": "concise_snake_case_key",
  "value": "clean formatted fact value",
  "category": "user_profile" | "preference" | "personal_detail" | "work" | "general",
  "secondaryMemories": { "city": "...", "company": "..." },
  "confirmation": "A natural, polite British-phrased confirmation speaking directly to ${owner}"
}`;

    const res = await llmService.chat({
      messages: [
        {
          role: 'user',
          content: prompt,
          timestamp: new Date(),
        },
      ],
      systemPrompt: 'You extract personal facts into structured JSON. Always output valid JSON only.',
    });

    const content = res.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.key || !parsed.value) return null;

    return {
      key: String(parsed.key).toLowerCase().replace(/[^a-z0-9_]/g, ''),
      value: String(parsed.value),
      category: parsed.category || 'general',
      secondaryMemories: parsed.secondaryMemories || {},
      confirmation: parsed.confirmation || `Saved, ${owner}. I'll remember that.`,
      rawInput: text,
    };
  }

  private static capitalizeWords(str: string): string {
    return str
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
