// src/features/scenarioEditor/core/features/historySystem/historyMiddleware.ts

import type { Middleware } from '@reduxjs/toolkit';

import { undoThunk, redoThunk } from './historySlice';
import { historyRegistry } from './historyRegistry';
import type { HistoryRecord } from './types';

/**
 * Middleware для автоматического применения команд при undo/redo
 *
 * ВАЖНО: Этот middleware обрабатывает ТОЛЬКО side-effects (вызовы handlers).
 * Сама история (past/future) обновляется через reducer в historySlice.
 */
export const historyMiddleware: Middleware = (storeApi) => (next) => (action) => {
    // 1. Сначала пропускаем action через reducer
    const result = next(action);

    // 2. ПОСЛЕ обновления state применяем side-effects

    // Обрабатываем undo (проверяем fulfilled action от thunk)
    if (undoThunk.fulfilled.match(action)) {
        const { contextId } = action.meta.arg;
        const state = storeApi.getState() as any;
        const context = state.history?.contexts?.[contextId];

        if (!context) {
            console.warn('[historyMiddleware] Context not found for undo:', contextId);
            return result;
        }

        // Получаем запись, которая была отменена (теперь в future[0])
        const record = context.future?.[0];
        if (!record) {
            console.warn('[historyMiddleware] No record to undo');
            return result;
        }

        console.log('[historyMiddleware] Executing undo for record:', record);

        try {
            executeUndo(record);
        } catch (error) {
            console.error('[historyMiddleware] Error executing undo:', error);
        }
    }

    // Обрабатываем redo (проверяем fulfilled action от thunk)
    if (redoThunk.fulfilled.match(action)) {
        const { contextId } = action.meta.arg;
        const state = storeApi.getState() as any;
        const context = state.history?.contexts?.[contextId];

        if (!context) {
            console.warn('[historyMiddleware] Context not found for redo:', contextId);
            return result;
        }

        // Получаем запись, которая была повторена (теперь в past[last])
        const record = context.past?.[context.past.length - 1];
        if (!record) {
            console.warn('[historyMiddleware] No record to redo');
            return result;
        }

        console.log('[historyMiddleware] Executing redo for record:', record);

        try {
            executeRedo(record);
        } catch (error) {
            console.error('[historyMiddleware] Error executing redo:', error);
        }
    }

    return result;
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Выполнить отмену команды
 */
function executeUndo(record: HistoryRecord): void {
    // Проверяем тип записи по полю type
    if (record.type === 'batch') {
        // Для батча выполняем все команды в ОБРАТНОМ порядке
        const batchRecord = record as any;
        if (batchRecord.records && Array.isArray(batchRecord.records)) {
            for (let i = batchRecord.records.length - 1; i >= 0; i--) {
                const cmd = batchRecord.records[i];
                if (cmd) {
                    executeUndo(cmd);
                }
            }
        }
        return;
    }

    const handler = historyRegistry.getHandler(record.entityType);
    if (!handler) {
        console.warn(`[executeUndo] No handler for type "${record.entityType}"`);
        return;
    }

    if (record.type === 'create') {
        // Отменить создание = удалить сущность
        handler.delete(record.entityId);
    } else if (record.type === 'update') {
        // Отменить обновление = восстановить previous состояние
        const before = (record as any).before;
        if (before) {
            handler.revert(before);
        }
    } else if (record.type === 'delete') {
        // Отменить удаление = создать сущность заново
        const before = (record as any).before;
        if (before) {
            handler.create(before);
        }
    }
}

/**
 * Выполнить повтор команды
 */
function executeRedo(record: HistoryRecord): void {
    // Проверяем тип записи по полю type
    if (record.type === 'batch') {
        // Для батча выполняем все команды в ПРЯМОМ порядке
        const batchRecord = record as any;
        if (batchRecord.records && Array.isArray(batchRecord.records)) {
            for (const cmd of batchRecord.records) {
                executeRedo(cmd);
            }
        }
        return;
    }

    const handler = historyRegistry.getHandler(record.entityType);
    if (!handler) {
        console.warn(`[executeRedo] No handler for type "${record.entityType}"`);
        return;
    }

    if (record.type === 'create') {
        // Повторить создание
        const after = (record as any).after;
        if (after) {
            handler.create(after);
        }
    } else if (record.type === 'update') {
        // Повторить обновление
        const after = (record as any).after;
        if (after) {
            handler.apply(after);
        }
    } else if (record.type === 'delete') {
        // Повторить удаление
        handler.delete(record.entityId);
    }
}