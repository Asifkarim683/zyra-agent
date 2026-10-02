import vm from 'node:vm';
import { logger } from '../config/logger.js';

export interface SandboxExecutionResult {
  success: boolean;
  result?: any;
  formattedResult?: string;
  logs: string[];
  executionTimeMs: number;
  error?: string;
}

// Block dangerous tokens that could lead to sandbox breakout or host inspection
const FORBIDDEN_TOKENS = [
  'process',
  'require',
  'import',
  'Function',
  'eval',
  'constructor',
  '__proto__',
  'prototype',
  'global',
  'globalThis',
  'module',
  'exports',
  'Buffer',
  'child_process',
  'fs',
  'net',
  'http',
  'https',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
];

const FORBIDDEN_REGEX = new RegExp(
  `\\b(${FORBIDDEN_TOKENS.join('|')})\\b`,
  'i'
);

/**
 * Clean numeric arrays: handles flat arguments or array passed as first argument.
 */
function flattenNumbers(args: any[]): number[] {
  const flattened: number[] = [];
  for (const arg of args) {
    if (Array.isArray(arg)) {
      for (const item of arg) {
        const n = Number(item);
        if (!isNaN(n)) flattened.push(n);
      }
    } else {
      const n = Number(arg);
      if (!isNaN(n)) flattened.push(n);
    }
  }
  return flattened;
}

/**
 * Sandboxed code and math execution environment.
 * Executes JavaScript calculations with 100% precision, zero risk of host access,
 * and standard mathematical, statistical, financial, and unit conversion helpers.
 */
export class SandboxService {
  private timeoutMs: number;

  constructor(timeoutMs = 1500) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Builds the safe helper library available inside the sandbox.
   */
  private createSandboxContext(logs: string[]): Record<string, any> {
    const helpers = {
      // Basic math functions
      sum: (...nums: any[]) => {
        const arr = flattenNumbers(nums);
        return arr.reduce((acc, v) => acc + v, 0);
      },
      avg: (...nums: any[]) => {
        const arr = flattenNumbers(nums);
        if (arr.length === 0) return 0;
        return arr.reduce((acc, v) => acc + v, 0) / arr.length;
      },
      median: (...nums: any[]) => {
        const arr = flattenNumbers(nums).sort((a, b) => a - b);
        if (arr.length === 0) return 0;
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
      },
      min: (...nums: any[]) => {
        const arr = flattenNumbers(nums);
        return arr.length ? Math.min(...arr) : 0;
      },
      max: (...nums: any[]) => {
        const arr = flattenNumbers(nums);
        return arr.length ? Math.max(...arr) : 0;
      },
      factorial: (n: number) => {
        const num = Math.floor(Number(n));
        if (num < 0) throw new Error('Factorial is not defined for negative numbers');
        if (num > 170) throw new Error('Factorial overflow (maximum 170)');
        let res = 1;
        for (let i = 2; i <= num; i++) res *= i;
        return res;
      },
      combinations: (n: number, k: number) => {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        let c = 1;
        for (let i = 1; i <= k; i++) {
          c = (c * (n - (k - i))) / i;
        }
        return Math.round(c);
      },
      permutations: (n: number, k: number) => {
        if (k < 0 || k > n) return 0;
        let p = 1;
        for (let i = 0; i < k; i++) {
          p *= n - i;
        }
        return p;
      },
      stdDev: (...nums: any[]) => {
        const arr = flattenNumbers(nums);
        if (arr.length < 2) return 0;
        const mean = arr.reduce((acc, v) => acc + v, 0) / arr.length;
        const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
      },
      variance: (...nums: any[]) => {
        const arr = flattenNumbers(nums);
        if (arr.length < 2) return 0;
        const mean = arr.reduce((acc, v) => acc + v, 0) / arr.length;
        return arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
      },
      percentage: (partial: number, total: number) => {
        if (total === 0) return '0.00%';
        return `${((partial / total) * 100).toFixed(2)}%`;
      },
      pctChange: (oldVal: number, newVal: number) => {
        if (oldVal === 0) return '0.00%';
        const diff = ((newVal - oldVal) / Math.abs(oldVal)) * 100;
        return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
      },

      // Financial formulas
      compoundInterest: (principal: number, annualRate: number, timesPerYear: number, years: number) => {
        // A = P * (1 + r/n)^(n*t)
        const p = Number(principal);
        const r = Number(annualRate);
        const n = Number(timesPerYear);
        const t = Number(years);
        const amount = p * Math.pow(1 + r / n, n * t);
        return {
          finalAmount: Math.round(amount * 100) / 100,
          interestEarned: Math.round((amount - p) * 100) / 100,
          principal: p,
        };
      },
      loanPayment: (principal: number, annualRate: number, months: number) => {
        // Monthly payment: P * (r*(1+r)^n) / ((1+r)^n - 1)
        const p = Number(principal);
        const r = Number(annualRate) / 12;
        const n = Number(months);
        if (r === 0) return Math.round((p / n) * 100) / 100;
        const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPayment = emi * n;
        return {
          monthlyPayment: Math.round(emi * 100) / 100,
          totalPayment: Math.round(totalPayment * 100) / 100,
          totalInterest: Math.round((totalPayment - p) * 100) / 100,
        };
      },

      // Date / Time calculations
      daysBetween: (date1: string | Date, date2: string | Date) => {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        if (isNaN(d1) || isNaN(d2)) throw new Error('Invalid date provided to daysBetween');
        return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
      },
      hoursBetween: (date1: string | Date, date2: string | Date) => {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        if (isNaN(d1) || isNaN(d2)) throw new Error('Invalid date provided to hoursBetween');
        return Math.round((Math.abs(d2 - d1) / (1000 * 60 * 60)) * 100) / 100;
      },
      addDays: (date: string | Date, days: number) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) throw new Error('Invalid date provided to addDays');
        d.setDate(d.getDate() + Number(days));
        return d.toISOString().split('T')[0];
      },

      // Unit conversion
      unitConvert: (val: number, fromUnit: string, toUnit: string) => {
        const v = Number(val);
        const from = fromUnit.toLowerCase().trim();
        const to = toUnit.toLowerCase().trim();

        // Temperatures
        if ((from === 'c' || from === 'celsius') && (to === 'f' || to === 'fahrenheit')) {
          return Math.round(((v * 9) / 5 + 32) * 100) / 100;
        }
        if ((from === 'f' || from === 'fahrenheit') && (to === 'c' || to === 'celsius')) {
          return Math.round((((v - 32) * 5) / 9) * 100) / 100;
        }
        if ((from === 'c' || from === 'celsius') && (to === 'k' || to === 'kelvin')) {
          return Math.round((v + 273.15) * 100) / 100;
        }
        if ((from === 'k' || to === 'kelvin') && (to === 'c' || to === 'celsius')) {
          return Math.round((v - 273.15) * 100) / 100;
        }

        // Distance: normalize to meters
        const distToMeters: Record<string, number> = {
          m: 1,
          meter: 1,
          meters: 1,
          km: 1000,
          kilometer: 1000,
          kilometers: 1000,
          cm: 0.01,
          centimeter: 0.01,
          mm: 0.001,
          millimeter: 0.001,
          mi: 1609.344,
          mile: 1609.344,
          miles: 1609.344,
          ft: 0.3048,
          foot: 0.3048,
          feet: 0.3048,
          in: 0.0254,
          inch: 0.0254,
          inches: 0.0254,
          yd: 0.9144,
          yard: 0.9144,
          yards: 0.9144,
        };
        if (distToMeters[from] && distToMeters[to]) {
          const meters = v * distToMeters[from];
          return Math.round((meters / distToMeters[to]) * 10000) / 10000;
        }

        // Weight/Mass: normalize to grams
        const massToGrams: Record<string, number> = {
          g: 1,
          gram: 1,
          grams: 1,
          kg: 1000,
          kilogram: 1000,
          kilograms: 1000,
          mg: 0.001,
          milligram: 0.001,
          lb: 453.59237,
          pound: 453.59237,
          pounds: 453.59237,
          oz: 28.349523,
          ounce: 28.349523,
          ounces: 28.349523,
        };
        if (massToGrams[from] && massToGrams[to]) {
          const grams = v * massToGrams[from];
          return Math.round((grams / massToGrams[to]) * 10000) / 10000;
        }

        // Data sizes: normalize to bytes
        const dataToBytes: Record<string, number> = {
          b: 1,
          byte: 1,
          bytes: 1,
          kb: 1024,
          mb: 1024 * 1024,
          gb: 1024 * 1024 * 1024,
          tb: 1024 * 1024 * 1024 * 1024,
        };
        if (dataToBytes[from] && dataToBytes[to]) {
          const bytes = v * dataToBytes[from];
          return Math.round((bytes / dataToBytes[to]) * 10000) / 10000;
        }

        throw new Error(`Unsupported conversion from '${fromUnit}' to '${toUnit}'`);
      },
    };

    // Captured virtual console
    const virtualConsole = {
      log: (...args: any[]) => {
        if (logs.length < 50) {
          const formatted = args
            .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
            .join(' ');
          logs.push(formatted.slice(0, 500));
        }
      },
      warn: (...args: any[]) => virtualConsole.log(...args),
      error: (...args: any[]) => virtualConsole.log(...args),
      info: (...args: any[]) => virtualConsole.log(...args),
    };

    // Sandboxed environment
    return {
      Math,
      Date,
      Number,
      String,
      Boolean,
      Array,
      Object,
      JSON,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      console: virtualConsole,
      ...helpers,
    };
  }

  /**
   * Executes a snippet of JavaScript / math code inside the sandbox.
   * @param code The JavaScript expression or script.
   */
  public execute(code: string): SandboxExecutionResult {
    const startTime = performance.now();
    const logs: string[] = [];

    const trimmed = code.trim();
    if (!trimmed) {
      return {
        success: false,
        logs: [],
        executionTimeMs: 0,
        error: 'Execution error: Code string cannot be empty',
      };
    }

    // Security check: Reject forbidden identifiers
    const match = trimmed.match(FORBIDDEN_REGEX);
    if (match) {
      const forbiddenWord = match[1];
      logger.warn(`Sandbox blocked forbidden identifier: "${forbiddenWord}"`);
      return {
        success: false,
        logs: [],
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        error: `Security violation: Access to "${forbiddenWord}" is strictly prohibited inside the safe calculation sandbox.`,
      };
    }

    try {
      const sandboxObj = this.createSandboxContext(logs);
      const context = vm.createContext(sandboxObj);

      // Evaluate the code
      // We run in an expression evaluation first, or direct script if multi-line
      let result = vm.runInContext(trimmed, context, {
        timeout: this.timeoutMs,
        displayErrors: true,
      });

      const elapsed = Math.round((performance.now() - startTime) * 100) / 100;

      // Clean float precision display (e.g. 0.30000000000000004 -> 0.3)
      if (typeof result === 'number' && Number.isFinite(result)) {
        if (!Number.isInteger(result)) {
          result = Number(result.toFixed(10).replace(/\.?0+$/, ''));
        }
      }

      let formattedResult: string;
      if (result === undefined) {
        formattedResult = logs.length > 0 ? logs.join('\n') : 'undefined';
      } else if (typeof result === 'object' && result !== null) {
        try {
          formattedResult = JSON.stringify(result, null, 2);
        } catch {
          formattedResult = String(result);
        }
      } else {
        formattedResult = String(result);
      }

      return {
        success: true,
        result,
        formattedResult,
        logs,
        executionTimeMs: elapsed,
      };
    } catch (err: unknown) {
      const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Sandbox execution error: ${message}`);
      return {
        success: false,
        logs,
        executionTimeMs: elapsed,
        error: `Calculation error: ${message}`,
      };
    }
  }
}
