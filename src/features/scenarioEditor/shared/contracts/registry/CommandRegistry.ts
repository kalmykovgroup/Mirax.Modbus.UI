// src/features/scenarioEditor/shared/contracts/registry/CommandRegistry.ts

import type { CommandHandler } from './CommandHandler';
import type { AnyScenarioCommand } from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';
import type { AppDispatch } from '@/baseStore/store';
import type { UseHistoryResult } from '@scenario/core/features/historySystem/useHistory';

class CommandRegistry {
    private readonly handlers = new Map<string, CommandHandler>();

    register(handler: CommandHandler): void {
        this.handlers.set(handler.commandType, handler);
        console.log(`[CommandRegistry] Registered handler for: ${handler.commandType}`);
    }

    execute(command: AnyScenarioCommand, dispatch: AppDispatch, history: UseHistoryResult): void {
        const handler = this.handlers.get(command.type);

        if (handler == null) {
            console.error(`[CommandRegistry] No handler for command type: ${command.type}`);
            return;
        }

        if (!handler.canHandle(command)) {
            console.error(`[CommandRegistry] Handler cannot process command: ${command.type}`);
            return;
        }

        handler.execute(command, dispatch, history);
    }

    getAllHandlers(): readonly CommandHandler[] {
        return Array.from(this.handlers.values());
    }
}

export const commandRegistry = new CommandRegistry();