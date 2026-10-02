/**
 * Fast, deterministic Damerau-Levenshtein distance calculation.
 * Computes minimum edits (insertions, deletions, substitutions, and transpositions of adjacent characters).
 */
export function damerauLevenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Optimization: quick length difference check
  if (Math.abs(la - lb) > 2) return Math.abs(la - lb);

  const d: number[][] = [];
  for (let i = 0; i <= la; i++) d[i] = [i];
  for (let j = 0; j <= lb; j++) d[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[la][lb];
}

/**
 * Curated high-frequency typo dictionary for fast O(1) keyword normalization.
 */
const COMMON_TYPOS: Record<string, string> = {
  // Greetings & System
  zyraa: 'zyra',
  zyrah: 'zyra',
  zira: 'zyra',
  zirah: 'zyra',
  zyar: 'zyra',
  hllo: 'hello',
  helo: 'hello',
  helllo: 'hello',
  helol: 'hello',
  hallo: 'hello',
  heyy: 'hey',
  hy: 'hey',
  thx: 'thanks',
  thnx: 'thanks',
  thanx: 'thanks',
  thnks: 'thanks',
  ty: 'thank you',
  thanku: 'thank you',
  thankyou: 'thank you',
  byee: 'bye',
  gudbye: 'goodbye',
  godbye: 'goodbye',
  gud: 'good',
  mrng: 'morning',
  mornin: 'morning',
  aftrnoon: 'afternoon',
  evnin: 'evening',
  evning: 'evening',

  // Music & Media
  plaay: 'play',
  ply: 'play',
  paly: 'play',
  playy: 'play',
  plsy: 'play',
  playe: 'play',
  spotfy: 'spotify',
  spoti: 'spotify',
  spotif: 'spotify',
  spotofy: 'spotify',
  spottify: 'spotify',
  spotiify: 'spotify',
  youtub: 'youtube',
  youtbe: 'youtube',
  yuotube: 'youtube',
  youtubee: 'youtube',
  yotube: 'youtube',
  yt: 'youtube',
  sng: 'song',
  msuic: 'music',
  muisc: 'music',
  musci: 'music',
  misic: 'music',
  musik: 'music',
  trck: 'track',
  trak: 'track',
  traack: 'track',

  // Playback & System Control
  pus: 'pause',
  puase: 'pause',
  paws: 'pause',
  paus: 'pause',
  pase: 'pause',
  stpo: 'stop',
  stoop: 'stop',
  sotp: 'stop',
  stp: 'stop',
  resum: 'resume',
  resme: 'resume',
  unpuase: 'unpause',
  unpaws: 'unpause',
  skp: 'skip',
  nxt: 'next',
  cancl: 'cancel',
  cancle: 'cancel',
  quie: 'quiet',
  quitt: 'quit',

  // Weather & Climate
  weathr: 'weather',
  wether: 'weather',
  weatr: 'weather',
  waether: 'weather',
  wheather: 'weather',
  wethr: 'weather',
  temprature: 'temperature',
  temparature: 'temperature',
  tempreture: 'temperature',
  temperture: 'temperature',
  temp: 'temperature',
  forecat: 'forecast',
  forecastt: 'forecast',
  forecsat: 'forecast',
  forcst: 'forecast',
  raning: 'raining',
  rainin: 'raining',
  rainn: 'rain',
  clowdy: 'cloudy',

  // Time & Date
  tiem: 'time',
  tim: 'time',
  timme: 'time',
  tyme: 'time',
  dat: 'date',
  dtae: 'date',
  daet: 'date',
  curent: 'current',
  curernt: 'current',
  crrent: 'current',
  tday: 'today',
  todday: 'today',
  toady: 'today',
  '2day': 'today',
  tommorow: 'tomorrow',
  tommorrow: 'tomorrow',
  tomorow: 'tomorrow',
  tomrw: 'tomorrow',
  tmrw: 'tomorrow',
  '2morrow': 'tomorrow',

  // Alarms, Reminders & Timers
  alrm: 'alarm',
  allarm: 'alarm',
  alaarm: 'alarm',
  alam: 'alarm',
  wak: 'wake',
  waek: 'wake',
  remindr: 'reminder',
  remidner: 'reminder',
  reminde: 'reminder',
  remnd: 'remind',
  remimber: 'remember',
  timr: 'timer',
  timmer: 'timer',
  stopwach: 'stopwatch',
  minuts: 'minutes',
  minits: 'minutes',
  minit: 'minute',
  mins: 'minutes',
  secnds: 'seconds',
  seconts: 'seconds',
  secs: 'seconds',

  // Tasks & To-dos
  tsk: 'task',
  taks: 'task',
  tsak: 'task',
  tast: 'task',
  checlist: 'checklist',
  chklist: 'checklist',

  // Memory & Preferences
  rember: 'remember',
  remeber: 'remember',
  rememebr: 'remember',
  remembr: 'remember',
  rmbr: 'remember',
  forgit: 'forget',
  farget: 'forget',
  foget: 'forget',
  frget: 'forget',
  prefrence: 'preference',
  preferance: 'preference',
  favrite: 'favorite',
  favurite: 'favorite',
  favrot: 'favorite',
  fav: 'favorite',

  // Briefing, Computation & Search
  breif: 'brief',
  brifing: 'briefing',
  breifing: 'briefing',
  calulate: 'calculate',
  calclate: 'calculate',
  calculat: 'calculate',
  calcualte: 'calculate',
  comput: 'compute',
};

/**
 * System target keywords for bounded fuzzy Damerau-Levenshtein matching.
 * Typo correction only maps towards this strictly defined vocabulary.
 */
const TARGET_KEYWORDS = [
  'zyra',
  'assistant',
  'time',
  'date',
  'current',
  'today',
  'tomorrow',
  'yesterday',
  'morning',
  'afternoon',
  'evening',
  'night',
  'clock',
  'timezone',
  'weather',
  'forecast',
  'temperature',
  'raining',
  'play',
  'pause',
  'resume',
  'stop',
  'unpause',
  'music',
  'song',
  'track',
  'spotify',
  'youtube',
  'listen',
  'alarm',
  'wake',
  'reminder',
  'remind',
  'timer',
  'countdown',
  'stopwatch',
  'minute',
  'minutes',
  'second',
  'seconds',
  'hour',
  'hours',
  'task',
  'tasks',
  'todo',
  'todos',
  'checklist',
  'remember',
  'recall',
  'forget',
  'preference',
  'favorite',
  'briefing',
  'brief',
  'status',
  'system',
  'calculate',
  'compute',
  'search',
  'please',
  'could',
  'would',
  'thanks',
  'thank',
  'hello',
  'goodbye',
  'cancel',
];

const TARGET_KEYWORDS_SET = new Set(TARGET_KEYWORDS);

/**
 * Common English stopwords and functional words that must NEVER be modified by fuzzy matching.
 */
const PROTECTED_WORDS = new Set([
  'a',
  'an',
  'the',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'it',
  'is',
  'am',
  'are',
  'be',
  'do',
  'did',
  'me',
  'my',
  'we',
  'us',
  'he',
  'him',
  'she',
  'her',
  'they',
  'them',
  'so',
  'no',
  'not',
  'go',
  'up',
  'out',
  'by',
  'if',
  'or',
  'as',
  'and',
  'but',
  'can',
  'how',
  'who',
  'why',
  'what',
  'when',
  'where',
  'which',
  'all',
  'any',
  'say',
  'get',
  'got',
  'set',
  'put',
  'run',
  'now',
  'see',
  'let',
  'day',
  'new',
  'old',
  'one',
  'two',
  'ten',
  'big',
  'hot',
  'cold',
  'far',
  'low',
  'top',
  'off',
  'right',
  'night',
  'kindly',
  'well',
  'good',
  'like',
  'with',
  'from',
  'some',
  'time',
  'home',
  'work',
  'city',
  'call',
  'tell',
]);

/**
 * Universal Typo Corrector for Zyra Assistant.
 * Provides deterministic and bounded fuzzy spelling healing across all conversational
 * utterances, skill intents, parameter extraction, and tool gating.
 */
export class TypoCorrector {
  /**
   * Preserves the original casing pattern (uppercase, titlecase, lowercase) when replacing a token.
   */
  private static preserveCase(original: string, replacement: string): string {
    if (original === original.toUpperCase() && original.length > 1) {
      return replacement.toUpperCase();
    }
    if (original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  /**
   * Corrects a single word token if it matches a known typo or fuzzy target keyword.
   */
  private static correctToken(token: string): string {
    if (!token || /^\d+$/.test(token)) return token;

    const lower = token.toLowerCase();

    // Never alter protected common English stopwords
    if (PROTECTED_WORDS.has(lower)) {
      return token;
    }

    // 1. Direct O(1) dictionary match
    if (COMMON_TYPOS[lower]) {
      return this.preserveCase(token, COMMON_TYPOS[lower]);
    }

    // If word is already a known target keyword, leave it
    if (TARGET_KEYWORDS_SET.has(lower)) {
      return token;
    }

    // Guard: never fuzzy match short words (<= 3 chars) to prevent false positives
    if (lower.length <= 3) {
      return token;
    }

    // 2. Bounded fuzzy matching against TARGET_KEYWORDS
    // 4-5 chars: max distance 1
    // >= 6 chars: max distance 2
    const maxDistance = lower.length >= 6 ? 2 : 1;
    let bestMatch: string | null = null;
    let bestDistance = maxDistance + 1;

    for (const target of TARGET_KEYWORDS) {
      // Quick length difference check
      if (Math.abs(lower.length - target.length) > maxDistance) continue;

      // First character MUST match strictly to prevent cross-word phonetic jumps
      if (lower[0] !== target[0]) {
        continue;
      }

      const dist = damerauLevenshtein(lower, target);
      if (dist <= maxDistance && dist < bestDistance) {
        bestDistance = dist;
        bestMatch = target;
      }
    }

    if (bestMatch && bestDistance <= maxDistance) {
      return this.preserveCase(token, bestMatch);
    }

    return token;
  }

  /**
   * Corrects typos in the given text string.
   */
  public static correct(text: string): string {
    if (!text || typeof text !== 'string') return text;

    // 1. Pre-process phrase-level patterns
    let res = text
      .replace(/\bad\s+(task|taks|tast|tsk|todo|note)\b/gi, 'add $1')
      .replace(/\bwhats\b/gi, "what's")
      .replace(/\bhows\b/gi, "how's");

    // 2. Token-level corrections
    res = res.replace(/\b[a-zA-Z0-9'-]+\b/g, (token) => this.correctToken(token));

    // 3. Post-process phrase normalization
    res = res
      .replace(/\bad\s+task\b/gi, 'add task')
      .replace(/\bplaay\b/gi, 'play')
      .replace(/\bply\b/gi, 'play');

    return res;
  }

  /**
   * Corrects typos and returns detailed diagnostic metadata about changes made.
   */
  public static correctWithDetails(text: string): {
    original: string;
    corrected: string;
    hasCorrections: boolean;
    correctionsCount: number;
  } {
    const original = text;
    const corrected = this.correct(text);
    return {
      original,
      corrected,
      hasCorrections: original !== corrected,
      correctionsCount: original !== corrected ? 1 : 0,
    };
  }
}
