// src/features/history/initHistory.ts



import {registerStepHandlers} from "@scenario/core/features/historySystem/handlers/stepHistoryHandlers.ts";
import {registerBranchHandler} from "@scenario/core/features/historySystem/handlers/branchHistoryHandler.ts";
import {registerRelationHandler} from "@scenario/core/features/historySystem/handlers/relationHistoryHandler.ts";

/**
 * Регистрация всех entity handlers при старте приложения
 */
export function initHistorySystem(): void {
    console.log('[History] Initializing history system...');

    registerStepHandlers();
    registerBranchHandler();
    registerRelationHandler();

    console.log('[History] ✅ History system initialized');
}