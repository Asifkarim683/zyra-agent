import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import type { SystemAutomationService } from '../services/system-automation-service.js';

/**
 * Skill providing secure local desktop automation with mandatory Human-in-the-Loop confirmation.
 * Strictly blocks sensitive, destructive, or unauthorized commands.
 */
export class SystemAutomationSkill extends BaseSkill {
  name = 'system_automation';
  description = 'Safely stages and executes allowlisted desktop automations with explicit user confirmation';

  private automationService: SystemAutomationService;

  constructor(automationService: SystemAutomationService) {
    super();
    this.automationService = automationService;
  }

  patterns: IntentPattern[] = [
    // 1. Prohibited commands (explicitly intercepted to provide clear security feedback)
    {
      pattern: /^(?:shutdown|restart|reboot|logoff|kill (?:process )?|taskkill|delete (?:file )?|format c:?|run (?:powershell|cmd|script)|download (?:and run|file))/i,
      intent: 'prohibited_action',
    },
    // 2. Launching allowlisted desktop apps
    {
      pattern: /^(?:can you (?:please )?(?:open|launch|start) )([a-zA-Z0-9\s._-]+)$/i,
      intent: 'launch_app',
      extractParams: (match) => ({ target: match[1].trim() }),
    },
    {
      pattern: /^(?:open|launch|start|run) ([a-zA-Z0-9\s._-]+)$/i,
      intent: 'launch_app',
      extractParams: (match) => ({ target: match[1].trim() }),
    },
    // 3. Confirming a pending automation action
    {
      pattern: /^(?:confirm|proceed|yes proceed|yes please|do it|confirm action|yes launch it|yes open it)$/i,
      intent: 'confirm_action',
    },
    // 4. Cancelling a pending automation action
    {
      pattern: /^(?:cancel action|don't do it|abort|cancel launch|do not launch|no cancel)$/i,
      intent: 'cancel_action',
    },
  ];

  async execute(context: SkillContext): Promise<SkillResult> {
    const intent = context.intent.intent;

    // 1. PROHIBITED ACTION BLOCK
    if (intent === 'prohibited_action') {
      return this.success(
        'Security policy block: Destructive or sensitive system actions (such as shutdowns, killing processes, and executing raw scripts) are strictly prohibited to protect your system.'
      );
    }

    // 2. LAUNCH APP (STAGING PHASE)
    if (intent === 'launch_app') {
      const target = (context.intent.parameters?.target || '').trim();
      if (!target) {
        return this.success('Which application would you like to open?');
      }

      // Prohibited check on target parameter
      if (this.automationService.isProhibitedCommand(target)) {
        return this.success(
          'Security policy block: Destructive or sensitive system actions are strictly prohibited.'
        );
      }

      const stageResult = this.automationService.stageLaunchApp(target);

      if (!stageResult.success) {
        return this.success(stageResult.message);
      }

      // Return with structured pending_confirmation action for UI card rendering
      return {
        response: stageResult.message,
        action: 'pending_confirmation',
        data: {
          actionId: stageResult.pendingAction?.id,
          type: 'launch_app',
          target: stageResult.pendingAction?.targetName,
          description: stageResult.pendingAction?.description,
          expiresIn: 60,
        },
        speak: true,
      };
    }

    // 3. CONFIRM ACTION
    if (intent === 'confirm_action') {
      const result = this.automationService.confirmAction();
      return {
        response: result.message,
        action: result.success ? 'automation_executed' : 'automation_error',
        data: { target: result.target },
        speak: true,
      };
    }

    // 4. CANCEL ACTION
    if (intent === 'cancel_action') {
      const result = this.automationService.cancelAction();
      return {
        response: result.message,
        action: 'automation_cancelled',
        speak: true,
      };
    }

    return this.success("I couldn't process that automation command.");
  }
}
