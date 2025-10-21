// src/features/scenarioEditor/core/features/scenarioChangeCenter/CommandDispatcher.ts

import type { AppDispatch } from '@/baseStore/store';
import type { UseHistoryResult } from '@scenario/core/features/historySystem/useHistory';
import {
    type AnyScenarioCommand,
    isBatchCommand,
} from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';
import { commandRegistry } from '@scenario/shared/contracts/registry/CommandRegistry';

export class CommandDispatcher {
    private readonly dispatch: AppDispatch;
    private readonly history: UseHistoryResult;

    constructor( dispatch: AppDispatch, history: UseHistoryResult) {
        this.dispatch = dispatch;
        this.history = history;
    }

    execute(command: AnyScenarioCommand): void {
        console.log('[CommandDispatcher] Executing:', command.type, command.payload);

        if (isBatchCommand(command)) {
            this.history.startBatch();
            for (const cmd of command.payload.commands) {
                this.executeCommand(cmd);
            }
            this.history.commitBatch(command.payload.description);
        } else {
            this.executeCommand(command);
        }
    }

    startBatch(): void {
        this.history.startBatch();
    }

    commitBatch(description?: string): void {
        this.history.commitBatch(description);
    }

    cancelBatch(): void {
        this.history.cancelBatch();
    }

    private executeCommand(command: AnyScenarioCommand): void {
        commandRegistry.execute(command, this.dispatch, this.history);
    }
}