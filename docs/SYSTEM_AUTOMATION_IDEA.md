# Desktop System Automation Architecture (Concept & Idea)

> **Status**: Preserved as an architectural blueprint and standby module. Detached from the active AI model runtime.

This document describes the design, security protocols, and implementation of local desktop automation for the Zyra AI Assistant. All components are preserved in the codebase and can be reactivated in a single step whenever desired.

---

## 1. Overview & Objective

The Desktop Automation module enables Zyra to open pre-approved desktop utility applications on the user's interactive desktop when explicitly requested (e.g., *"open calculator"*, *"open visual studio code"*, *"launch notepad"*, *"open spotify"*).

To prevent accidental execution or abuse, the system strictly enforces **Human-in-the-Loop (HITL) 2-phase confirmation** and an immutable security allowlist.

---

## 2. Key Architecture Components

| Component | File Location | Purpose |
| :--- | :--- | :--- |
| **System Automation Service** | [`src/services/system-automation-service.ts`](../src/services/system-automation-service.ts) | Implements the allowlist, prohibited regex filters, OS availability checks, and platform-specific desktop process launching. |
| **System Automation Skill** | [`src/skills/system-automation-skill.ts`](../src/skills/system-automation-skill.ts) | Natural language skill mapping queries to staging, confirmation, or cancellation intents. |
| **Audit Logging** | [`src/services/database.ts`](../src/services/database.ts) (`automation_audit` table) | Persists all staged, confirmed, rejected, and cancelled automation actions to SQLite. |
| **REST Endpoints** | [`src/routes/automation.ts`](../src/routes/automation.ts) | API endpoints (`/pending`, `/confirm`, `/cancel`, `/audit`). |
| **Frontend Confirmation Card** | [`client/src/components/MessageBubble.tsx`](../client/src/components/MessageBubble.tsx) | Interactive UI confirmation modal with Confirm and Cancel buttons. |

---

## 3. Security & Safety Model

### A. Immutable Allowlist
Only pre-approved applications can ever be launched:
1. **Calculator** (`calc.exe`, `calculator:`)
2. **Notepad** (`notepad.exe`)
3. **Visual Studio Code** (`code.cmd`, `code.exe`, `code`)
4. **Spotify** (`spotify:`, `spotify.exe`)
5. **Paint** (`mspaint.exe`)
6. **Windows Terminal** (`wt.exe`, `cmd.exe`)

Arbitrary executables, external scripts, and non-allowlisted apps are immediately rejected.

### B. Prohibited Command Defense
Destructive keywords are permanently blocked by a regex filter before intent evaluation:
- System power: `shutdown`, `restart`, `reboot`, `logoff`
- Process control: `kill`, `taskkill`, `pkill`
- Filesystem/disk: `format`, `del`, `delete`, `rmdir`, `rm`, `diskpart`
- Arbitrary script shells: `powershell`, `cmd.exe`, `bash`, `sh`, `reg`, `registry`
- Network tools: `curl`, `wget`, `certutil`, `bitsadmin`, `download`

### C. Safe Pre-Flight Availability Check
Before any action is staged:
- The system checks whether the target is actually installed on the user's OS via `isCommandAvailable()` (`where.exe` on Windows, `which` on Unix, or URI protocol verification).
- If the app is not installed, Zyra provides immediate feedback rather than staging an unlaunchable command.

### D. Human-in-the-Loop (HITL) Execution
- **Phase 1: Staging**: When the user requests an app, it is staged with an ephemeral `actionId` and a 60-second time-to-live (TTL). The app is **not** launched yet.
- **Phase 2: Confirmation**: The user must explicitly confirm (via voice/chat *"confirm"* or by clicking the **Confirm & Launch** button). If 60 seconds elapse, the action expires automatically.

### E. Native Interactive WindowStation Attachment
- Direct headless child processes (`spawn(..., { shell: false })`) do not attach to the user's interactive desktop window station in Windows.
- The service launches allowlisted targets using Windows Shell (`cmd.exe /c start "" <target>`) with `detached: true, stdio: 'ignore', windowsHide: true`.
- Because targets are strictly resolved from hardcoded internal constants (never raw user text), this mechanism is immune to shell injection while ensuring GUI windows appear immediately.

---

## 4. How to Re-Integrate into the Model

To reconnect system automation into the active model runtime in the future:

1. Open [`src/container.ts`](../src/container.ts).
2. Update the `registerAllSkills` call to pass `enableAutomation: true`:
   ```typescript
   // Enable system automation in the model
   registerAllSkills(skillRegistry, databaseService, systemAutomationService, {
     enableAutomation: true,
   });
   ```
3. That's it! Zyra will immediately regain the ability to safely stage and execute pre-approved desktop applications with explicit confirmation.
