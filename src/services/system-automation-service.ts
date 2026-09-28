import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger.js';
import type { DatabaseService } from './database.js';

export interface AllowedApp {
  key: string;
  name: string;
  executable: string;
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
 * Hardcoded allowlist of safe desktop applications.
 * Absolutely NO arbitrary executables or shell commands can be executed.
 */
export const ALLOWED_APPS: Record<string, AllowedApp> = {
  calculator: {
    key: 'calculator',
    name: 'Calculator',
    executable: 'calc.exe',
    description: 'Windows Calculator utility',
  },
  notepad: {
    key: 'notepad',
    name: 'Notepad',
    executable: 'notepad.exe',
    description: 'Text editor utility',
  },
  vscode: {
    key: 'vscode',
    name: 'Visual Studio Code',
    executable: 'code',
    description: 'Code editor application',
  },
  spotify: {
    key: 'spotify',
    name: 'Spotify',
    executable: 'spotify',
    description: 'Music player application',
  },
  paint: {
    key: 'paint',
    name: 'Paint',
    executable: 'mspaint.exe',
    description: 'Drawing application',
  },
  terminal: {
    key: 'terminal',
    name: 'Windows Terminal',
    executable: 'wt.exe',
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

    // 3. Stage the pending action with a 60-second TTL
    const actionId = `act-${uuidv4().slice(0, 8)}`;
    const now = Date.now();
    const action: PendingAction = {
      id: actionId,
      type: 'launch_app',
      targetKey: app.key,
      targetName: app.name,
      description: `Launch ${app.name} (${app.executable})`,
      createdAt: now,
      expiresAt: now + 60000,
    };

    this.pendingAction = action;

    if (this.dbService) {
      this.dbService.logAutomationAudit(actionId, 'launch_app', app.name, 'staged');
    }

    logger.info(`Staged pending automation action: ${actionId} for ${app.name}`);

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

    // Clear pending state prior to execution
    this.pendingAction = null;

    try {
      logger.info(`Executing confirmed system automation: ${app.name} (${app.executable})`);

      // CRITICAL: shell: false prevents command injection
      const proc = spawn(app.executable, app.args || [], {
        detached: true,
        stdio: 'ignore',
        shell: false,
      });

      proc.on('error', (err) => {
        logger.error(`Error executing ${app.executable}: ${err.message}`);
      });

      proc.unref();

      if (this.dbService) {
        this.dbService.logAutomationAudit(action.id, 'launch_app', app.name, 'executed');
      }

      return {
        success: true,
        target: app.name,
        message: `Confirmed. I've launched ${app.name} for you.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Execution failed for ${app.name}: ${msg}`);
      return {
        success: false,
        message: `Failed to launch ${app.name}: ${msg}`,
      };
    }
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
