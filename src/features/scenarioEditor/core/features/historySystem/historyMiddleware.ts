// src/features/scenarioEditor/core/features/historySystem/historyMiddleware.ts

import type { Middleware } from '@reduxjs/toolkit';
import { undoThunk, redoThunk } from './historySlice';
import { historyRegistry } from './historyRegistry';
import type { HistoryRecord } from './types';

export const historyMiddleware: Middleware = (storeApi) => (next) => (action) => {
    const result = next(action);

    if (undoThunk.fulfilled.match(action)) {
        const { contextId } = action.meta.arg;
        const state = storeApi.getState() as any;
        const context = state.history?.contexts?.[contextId];

        if (!context) return result;

        const record = context.future?.[0];
        if (!record) return result;

        console.log('[historyMiddleware] Executing undo for record:', record);

        try {
            executeUndo(record);
        } catch (error) {
            console.error('[historyMiddleware] Error executing undo:', error);
        }
    }

    if (redoThunk.fulfilled.match(action)) {
        const { contextId } = action.meta.arg;
        const state = storeApi.getState() as any;
        const context = state.history?.contexts?.[contextId];

        if (!context) return result;

        const record = context.past?.[context.past.length - 1];
        if (!record) return result;

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

function executeUndo(record: HistoryRecord): void {
    if (record.type === 'batch') {
        const batchRecord = record as any;
        if (batchRecord.records && Array.isArray(batchRecord.records)) {
            for (let i = batchRecord.records.length - 1; i >= 0; i--) {
                const cmd = batchRecord.records[i];
                if (cmd) executeUndo(cmd);
            }
        }
        return;
    }

    if (record.type === 'create') {
        // Отменить создание = удалить
        historyRegistry.deleteEntity(record.entityType, record.entityId as any);
    } else if (record.type === 'update') {
        // Отменить обновление = восстановить previous
        const before = (record as any).before;
        if (before) historyRegistry.revertSnapshot(before);
    } else if (record.type === 'delete') {
        // Отменить удаление = создать заново
        const before = (record as any).before;
        if (before) historyRegistry.createFromSnapshot(before);
    }
}

function executeRedo(record: HistoryRecord): void {
    if (record.type === 'batch') {
        const batchRecord = record as any;
        if (batchRecord.records && Array.isArray(batchRecord.records)) {
            for (const cmd of batchRecord.records) {
                executeRedo(cmd);
            }
        }
        return;
    }

    if (record.type === 'create') {
        const after = (record as any).after;
        if (after) historyRegistry.createFromSnapshot(after);
    } else if (record.type === 'update') {
        const after = (record as any).after;
        if (after) historyRegistry.applySnapshot(after);
    } else if (record.type === 'delete') {
        historyRegistry.deleteEntity(record.entityType, record.entityId as any);
    }
}