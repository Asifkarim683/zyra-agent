import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger.js';
import type { DatabaseService } from './database.js';

export interface AllowedApp {
  key: string;
  name: string;
  executable: string;
  windowsTargets: string[];
  macosTargets?: string[];
  linuxTargets?: string[];
  args?: string[];
  description: string;
}

export interface PendingAction {
  id: string;
  type: 'launch_app';
  targetKey: string;
  targetName: string;
  description: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Checks if an application command or protocol is available on the current operating system.
 */
export function isCommandAvailable(target: string): boolean {
  // Protocol URI handlers (e.g., 'calculator:', 'spotify:') are supported directly by OS shell
  if (target.endsWith(':')) {
    return true;
  }

  try {
    if (process.platform === 'win32') {
      execSync(`where ${target}`, { stdio: 'ignore', timeout: 2000 });
      return true;
    } else {
      execSync(`which ${target}`, { stdio: 'ignore', timeout: 2000 });
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Hardcoded allowlist of safe desktop applications.
 * Absolutely NO arbitrary executables or shell commands can be executed.
 */
export const ALLOWED_APPS: Record<string, AllowedApp> = {
  calculator: {
    key: 'calculator',
    name: 'Calculator',
    executable: 'calc.exe',
    windowsTargets: ['calc.exe', 'calculator:'],
    macosTargets: ['Calculator'],
    linuxTargets: ['gnome-calculator', 'kcalc', 'xcalc'],
    description: 'Windows Calculator utility',
  },
  notepad: {
    key: 'notepad',
    name: 'Notepad',
    executable: 'notepad.exe',
    windowsTargets: ['notepad.exe'],
    macosTargets: ['TextEdit'],
    linuxTargets: ['gedit', 'kate', 'nano'],
    description: 'Text editor utility',
  },
  vscode: {
    key: 'vscode',
    name: 'Visual Studio Code',
    executable: 'code',
    windowsTargets: ['code.cmd', 'code.exe', 'code'],
    macosTargets: ['Visual Studio Code'],
    linuxTargets: ['code'],
    description: 'Code editor application',
  },
  spotify: {
    key: 'spotify',
    name: 'Spotify',
    executable: 'spotify',
    windowsTargets: ['spotify:', 'spotify.exe'],
    macosTargets: ['Spotify'],
    linuxTargets: ['spotify'],
    description: 'Music player application',
  },
  paint: {
    key: 'paint',
    name: 'Paint',
    executable: 'mspaint.exe',
    windowsTargets: ['mspaint.exe'],
    macosTargets: ['Paintbrush', 'Preview'],
    linuxTargets: ['pinta', 'gpaint', 'drawing'],
    description: 'Drawing application',
  },
  terminal: {
    key: 'terminal',
    name: 'Windows Terminal',
    executable: 'wt.exe',
    windowsTargets: ['wt.exe', 'cmd.exe'],
    macosTargets: ['Terminal'],
    linuxTargets: ['gnome-terminal', 'xterm', 'konsole'],
    description: 'Terminal console',
  },
};

/**
 * Patterns of sensitive, dangerous, or destructive actions that are PERMANENTLY PROHIBITED.
 */
const PROHIBITED_KEYWORDS = [
  'shutdown',
  'restart',
  'reboot',
  'logoff',
  'format',
  'del',
  'delete',
  'rmdir',
  'rm',
  'kill',
  'taskkill',
  'pkill',
  'reg',
  'registry',
  'powershell',
  'cmd.exe',
  'bash',
  'sh',
  'eval',
  'exec',
  'curl',
  'wget',
  'certutil',
  'bitsadmin',
  'net user',
  'vssadmin',
  'bcdedit',
  'diskpart',
  'download',
  'install',
  'uninstall',
];

/**
 * Service managing safe system automation with mandatory Human-in-the-Loop (HITL) confirmation.
 */
export class SystemAutomationService {
  private pendingAction: PendingAction | null = null;
  private dbService?: DatabaseService;

  constructor(dbService?: DatabaseService) {
    this.dbService = dbService;
  }

  /**
   * Checks if an input string contains any prohibited or destructive keywords.
   */
  public isProhibitedCommand(input: string): boolean {
    const lower = input.toLowerCase();
    return PROHIBITED_KEYWORDS.some((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lower);
    });
  }

  /**
   * Resolves a user's app request to an allowlisted app, or returns null.
   */
  public resolveApp(query: string): AllowedApp | null {
    const q = query.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    if (q.includes('calc') || q.includes('calculator')) return ALLOWED_APPS.calculator;
    if (q.includes('notepad') || q.includes('notes') || q.includes('texteditor')) return ALLOWED_APPS.notepad;
    if (q.includes('vscode') || q.includes('code') || q.includes('visualstudio')) return ALLOWED_APPS.vscode;
    if (q.includes('spotify') || q.includes('musicplayer')) return ALLOWED_APPS.spotify;
    if (q.includes('paint') || q.includes('drawing') || q.includes('mspaint')) return ALLOWED_APPS.paint;
    if (q.includes('terminal') || q.includes('winterminal') || q.includes('wt')) return ALLOWED_APPS.terminal;

    return null;
  }

  /**
   * Resolves the best available executable or protocol target for an allowed app on the current OS.
   */
  public resolveLaunchTarget(app: AllowedApp): string | null {
    if (process.platform === 'win32') {
      for (const target of app.windowsTargets) {
        if (isCommandAvailable(target)) {
          return target;
        }
      }
    } else if (process.platform === 'darwin') {
      const macTargets = app.macosTargets || [app.executable];
      for (const target of macTargets) {
        if (isCommandAvailable(target)) {
          return target;
        }
      }
    } else {
      const linuxTargets = app.linuxTargets || [app.executable];
      for (const target of linuxTargets) {
        if (isCommandAvailable(target)) {
          return target;
        }
      }
    }

    // Fallback in test environments
    if (process.env.NODE_ENV === 'test') {
      return app.executable;
    }

    return null;
  }

  /**
   * Stages a launch request for an allowlisted application.
   * Does NOT execute the application until explicitly confirmed by the user.
   */
  public stageLaunchApp(rawAppQuery: string): {
    success: boolean;
    prohibited?: boolean;
    pendingAction?: PendingAction;
    message: string;
  } {
    // 1. Check for prohibited commands
    if (this.isProhibitedCommand(rawAppQuery)) {
      logger.warn(`Security block: Attempted prohibited automation command: "${rawAppQuery}"`);
      if (this.dbService) {
        this.dbService.logAutomationAudit(
          uuidv4(),
          'prohibited_attempt',
          rawAppQuery,
          'rejected'
        );
      }
      return {
        success: false,
        prohibited: true,
        message:
          'Security restriction: Destructive system actions (power control, process termination, disk formatting, and arbitrary script execution) are strictly prohibited.',
      };
    }

    // 2. Validate against safe allowlist
    const app = this.resolveApp(rawAppQuery);
    if (!app) {
      return {
        success: false,
        message: `I cannot open "${rawAppQuery}". For security, only pre-approved desktop applications (Calculator, Notepad, VS Code, Spotify, Paint, Terminal) can be launched.`,
      };
    }

    // 3. Safe Check: Verify application executable or protocol is available on system
    const target = this.resolveLaunchTarget(app);
    if (!target) {
      return {
        success: false,
        message: `I found ${app.name} in my approved apps list, but it does not appear to be installed on your system.`,
      };
    }

    // 4. Stage the pending action with a 60-second TTL
    const actionId = `act-${uuidv4().slice(0, 8)}`;
    const now = Date.now();
    const action: PendingAction = {
      id: actionId,
      type: 'launch_app',
      targetKey: app.key,
      targetName: app.name,
      description: `Launch ${app.name} (${target})`,
      createdAt: now,
      expiresAt: now + 60000,
    };

    this.pendingAction = action;

    if (this.dbService) {
      this.dbService.logAutomationAudit(actionId, 'launch_app', app.name, 'staged');
    }

    logger.info(`Staged pending automation action: ${actionId} for ${app.name} (${target})`);

    return {
      success: true,
      pendingAction: action,
      message: `I'm ready to launch ${app.name}. Because this interacts with your operating system, please confirm to proceed.`,
    };
  }

  /**
   * Confirms and executes the currently staged pending action.
   */
  public confirmAction(actionId?: string): {
    success: boolean;
    message: string;
    target?: string;
  } {
    if (!this.pendingAction) {
      return {
        success: false,
        message: 'There are no pending system actions waiting for confirmation.',
      };
    }

    // Verify action ID if supplied
    if (actionId && this.pendingAction.id !== actionId) {
      return {
        success: false,
        message: 'The confirmation action ID did not match the current staged action.',
      };
    }

    // Check expiration (60 seconds)
    if (Date.now() > this.pendingAction.expiresAt) {
      const expiredName = this.pendingAction.targetName;
      if (this.dbService) {
        this.dbService.logAutomationAudit(
          this.pendingAction.id,
          'launch_app',
          expiredName,
          'rejected'
        );
      }
      this.pendingAction = null;
      return {
        success: false,
        message: `The confirmation request for ${expiredName} has expired (60s limit). Please request it again.`,
      };
    }

    const action = this.pendingAction;
    const app = ALLOWED_APPS[action.targetKey];

    if (!app) {
      this.pendingAction = null;
      return {
        success: false,
        message: 'The target application is not in the authorized allowlist.',
      };
    }

    // Safe Check: verify availability at confirmation time
    const target = this.resolveLaunchTarget(app);
    if (!target) {
      this.pendingAction = null;
      return {
        success: false,
        message: `Could not find ${app.name} on your system. Please verify that it is installed.`,
      };
    }

    // Clear pending state prior to execution
    this.pendingAction = null;

    // Desktop process spawning is strictly disabled. Kept as an architectural idea for future integration.
    logger.info(`Desktop process spawning is disabled: ${app.name}`);
    if (this.dbService) {
      this.dbService.logAutomationAudit(action.id, 'launch_app', app.name, 'disabled');
    }

    return {
      success: false,
      message: 'Desktop application automation is currently disabled.',
    };
  }

  /**
   * Cancels the currently pending action.
   */
  public cancelAction(actionId?: string): { success: boolean; message: string } {
    if (!this.pendingAction) {
      return {
        success: false,
        message: 'No pending system action to cancel.',
      };
    }

    if (actionId && this.pendingAction.id !== actionId) {
      return {
        success: false,
        message: 'Action ID mismatch.',
      };
    }

    const targetName = this.pendingAction.targetName;
    if (this.dbService) {
      this.dbService.logAutomationAudit(
        this.pendingAction.id,
        'launch_app',
        targetName,
        'cancelled'
      );
    }

    this.pendingAction = null;
    logger.info(`Cancelled pending automation action for: ${targetName}`);

    return {
      success: true,
      message: `Cancelled. I will not launch ${targetName}.`,
    };
  }

  /**
   * Returns current pending action or null.
   */
  public getPendingAction(): PendingAction | null {
    if (this.pendingAction && Date.now() > this.pendingAction.expiresAt) {
      this.pendingAction = null;
    }
    return this.pendingAction;
  }
}
