// src/features/scenarioEditor/shared/contracts/registry/CommandHandler.ts

import type { AppDispatch } from '@/baseStore/store';
import type { UseHistoryResult } from '@scenario/core/features/historySystem/useHistory';
import type { AnyScenarioCommand } from '@scenario/core/features/scenarioChangeCenter/scenarioCommands';

export interface CommandHandler {
    readonly commandType: string;
    readonly canHandle: (command: AnyScenarioCommand) => boolean;
    readonly execute: (
        command: AnyScenarioCommand,
        dispatch: AppDispatch,
        history: UseHistoryResult
    ) => void;
}