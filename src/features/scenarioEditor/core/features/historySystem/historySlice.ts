// src/features/scenarioEditor/core/features/historySystem/historySlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store';
import type {
    HistoryState,
    HistoryConfig,
    CreateRecord,
    UpdateRecord,
    DeleteRecord,
    Entity,
} from './types';
import { historyRegistry } from './historyRegistry';

const initialState: HistoryState = {
    contexts: {},
};

// ============================================================================
// THUNKS (вызывают методы из контрактов ВНЕ reducer)
// ============================================================================

export const undoThunk = createAsyncThunk<void, { contextId: string }, { state: RootState }>(
    'history/undoThunk',
    async ({ contextId }, { getState, dispatch }) => {
        const state = getState();
        const context = state.history.contexts[contextId];

        if (!context || context.past.length === 0) {
            console.warn('[historySlice] Cannot undo: no past records');
            return;
        }

        const record = context.past[context.past.length - 1];
        if (!record) return;

        console.log('[historySlice] Undoing record:', record);

        //  Применяем откат через historyRegistry → contract
        if (record.type === 'batch') {
            // ✅ ДОБАВЛЕНО: Обработка batch - откатываем все записи в обратном порядке
            const batchRecords = (record as any).records || [];
            for (let i = batchRecords.length - 1; i >= 0; i--) {
                const batchRecord = batchRecords[i];
                if (batchRecord.type === 'create') {
                    historyRegistry.deleteEntity(batchRecord.entityType, batchRecord.entityId as any);
                } else if (batchRecord.type === 'update') {
                    historyRegistry.revertSnapshot(batchRecord.before);
                } else if (batchRecord.type === 'delete') {
                    historyRegistry.createFromSnapshot(batchRecord.before);
                }
            }
        } else if (record.type === 'create') {
            historyRegistry.deleteEntity(record.entityType, record.entityId as any);
        } else if (record.type === 'update') {
            historyRegistry.revertSnapshot(record.before);
        } else if (record.type === 'delete') {
            historyRegistry.createFromSnapshot(record.before);
        }

        // Обновляем историю
        dispatch(undoCommit({ contextId }));
    }
);

export const redoThunk = createAsyncThunk<void, { contextId: string }, { state: RootState }>(
    'history/redoThunk',
    async ({ contextId }, { getState, dispatch }) => {
        const state = getState();
        const context = state.history.contexts[contextId];

        if (!context || context.future.length === 0) {
            console.warn('[historySlice] Cannot redo: no future records');
            return;
        }

        const record = context.future[0];
        if (!record) return;

        console.log('[historySlice] Redoing record:', record);

        //  Применяем повтор через historyRegistry → contract
        if (record.type === 'batch') {
            // ✅ ДОБАВЛЕНО: Обработка batch - применяем все записи в прямом порядке
            const batchRecords = (record as any).records || [];
            for (const batchRecord of batchRecords) {
                if (batchRecord.type === 'create') {
                    historyRegistry.createFromSnapshot(batchRecord.after);
                } else if (batchRecord.type === 'update') {
                    historyRegistry.applySnapshot(batchRecord.after);
                } else if (batchRecord.type === 'delete') {
                    historyRegistry.deleteEntity(batchRecord.entityType, batchRecord.entityId as any);
                }
            }
        } else if (record.type === 'create') {
            historyRegistry.createFromSnapshot(record.after);
        } else if (record.type === 'update') {
            historyRegistry.applySnapshot(record.after);
        } else if (record.type === 'delete') {
            historyRegistry.deleteEntity(record.entityType, record.entityId as any);
        }

        // Обновляем историю
        dispatch(redoCommit({ contextId }));
    }
);

// ============================================================================
// SLICE
// ============================================================================

export const historySlice = createSlice({
    name: 'history',
    initialState,
    reducers: {
        initializeContext: (
            state,
            action: PayloadAction<{ contextId: string; config: HistoryConfig }>
        ) => {
            const { contextId, config } = action.payload;

            if (!state.contexts[contextId]) {
                state.contexts[contextId] = {
                    past: [],
                    present: null,
                    future: [],
                    isRecording: true,
                    isBatching: false,
                    batchBuffer: [],
                    config,
                };
            }
        },

        recordCreate: (
            state,
            action: PayloadAction<{ contextId: string; entity: Entity }>
        ) => {
            const { contextId, entity } = action.payload;
            const context = state.contexts[contextId];

            if (!context) {
                console.error('[historySlice] Context not found:', contextId);
                return;
            }

            if (!context.isRecording) return;

            //  Создаём снимок через historyRegistry → contract
            const snapshot = historyRegistry.createSnapshot(entity);

            const record: CreateRecord = {
                id: crypto.randomUUID(),
                type: 'create',
                entityId: entity.id,
                entityType: entity.entityType,
                timestamp: Date.now(),
                before: null,
                after: snapshot,
            };

            console.log('[historySlice] Recording create:', record);

            if (context.isBatching) {
                state.contexts[contextId] = {
                    ...context,
                    batchBuffer: [...context.batchBuffer, record],
                };
            } else {
                state.contexts[contextId] = {
                    ...context,
                    past: [...context.past, record],
                    future: [],
                };
            }
        },

        recordUpdate: (
            state,
            action: PayloadAction<{
                contextId: string;
                newEntity: Entity;
                previousEntity: Entity;
            }>
        ) => {
            const { contextId, newEntity, previousEntity } = action.payload;
            const context = state.contexts[contextId];

            if (!context) {
                console.error('[historySlice] Context not found:', contextId);
                return;
            }

            if (!context.isRecording) return;

            //  Создаём снимки через historyRegistry → contract
            console.log('[historySlice] recordUpdate - previousEntity:', previousEntity);
            console.log('[historySlice] recordUpdate - newEntity:', newEntity);

            const beforeSnapshot = historyRegistry.createSnapshot(previousEntity);
            const afterSnapshot = historyRegistry.createSnapshot(newEntity);

            console.log('[historySlice] recordUpdate - beforeSnapshot:', beforeSnapshot);
            console.log('[historySlice] recordUpdate - afterSnapshot:', afterSnapshot);

            const record: UpdateRecord = {
                id: crypto.randomUUID(),
                type: 'update',
                entityId: newEntity.id,
                entityType: newEntity.entityType,
                timestamp: Date.now(),
                before: beforeSnapshot,
                after: afterSnapshot,
            };

            console.log('[historySlice] recordUpdate - final record:', record);

            if (context.isBatching) {
                state.contexts[contextId] = {
                    ...context,
                    batchBuffer: [...context.batchBuffer, record],
                };
            } else {
                state.contexts[contextId] = {
                    ...context,
                    past: [...context.past, record],
                    future: [],
                };
            }
        },

        recordDelete: (
            state,
            action: PayloadAction<{ contextId: string; entity: Entity }>
        ) => {
            const { contextId, entity } = action.payload;
            const context = state.contexts[contextId];

            if (!context) {
                console.error('[historySlice] Context not found:', contextId);
                return;
            }

            if (!context.isRecording) return;

            //  Создаём снимок через historyRegistry → contract
            const snapshot = historyRegistry.createSnapshot(entity);

            const record: DeleteRecord = {
                id: crypto.randomUUID(),
                type: 'delete',
                entityId: entity.id,
                entityType: entity.entityType,
                timestamp: Date.now(),
                before: snapshot,
                after: null,
            };

            console.log('[historySlice] Recording delete:', record);

            if (context.isBatching) {
                state.contexts[contextId] = {
                    ...context,
                    batchBuffer: [...context.batchBuffer, record],
                };
            } else {
                state.contexts[contextId] = {
                    ...context,
                    past: [...context.past, record],
                    future: [],
                };
            }
        },

        // ТОЛЬКО перемещение записи в past/future (БЕЗ вызова контрактов)
        undoCommit: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (!context || context.past.length === 0) return;

            const record = context.past[context.past.length - 1];
            if (!record) return;

            state.contexts[contextId] = {
                ...context,
                past: context.past.slice(0, -1),
                future: [record, ...context.future],
            };

            console.log(
                '[historySlice] Undo committed. Past:',
                context.past.length - 1,
                'Future:',
                context.future.length + 1
            );
        },

        // ТОЛЬКО перемещение записи в past/future (БЕЗ вызова контрактов)
        redoCommit: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (!context || context.future.length === 0) return;

            const record = context.future[0];
            if (!record) return;

            state.contexts[contextId] = {
                ...context,
                past: [...context.past, record],
                future: context.future.slice(1),
            };

            console.log(
                '[historySlice] Redo committed. Past:',
                context.past.length + 1,
                'Future:',
                context.future.length - 1
            );
        },

        startBatch: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (context) {
                state.contexts[contextId] = {
                    ...context,
                    isBatching: true,
                    batchBuffer: [],
                };
            }
        },

        commitBatch: (
            state,
            action: PayloadAction<{ contextId: string; description?: string | undefined }>
        ) => {
            const { contextId, description } = action.payload;
            const context = state.contexts[contextId];

            if (!context || !context.isBatching) return;

            if (context.batchBuffer.length > 0) {
                const batchRecord: any = {
                    id: crypto.randomUUID(),
                    type: 'batch',
                    entityId: 'batch',
                    entityType: 'batch',
                    timestamp: Date.now(),
                    description,
                    before: null,
                    after: null,
                    records: context.batchBuffer,
                };

                state.contexts[contextId] = {
                    ...context,
                    past: [...context.past, batchRecord],
                    future: [],
                    isBatching: false,
                    batchBuffer: [],
                };
            } else {
                state.contexts[contextId] = {
                    ...context,
                    isBatching: false,
                    batchBuffer: [],
                };
            }
        },

        cancelBatch: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (context) {
                state.contexts[contextId] = {
                    ...context,
                    isBatching: false,
                    batchBuffer: [],
                };
            }
        },

        clearHistory: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (context) {
                state.contexts[contextId] = {
                    ...context,
                    past: [],
                    future: [],
                    batchBuffer: [],
                };
            }
        },
    },
});

export const {
    initializeContext,
    recordCreate,
    recordUpdate,
    recordDelete,
    undoCommit,
    redoCommit,
    startBatch,
    commitBatch,
    cancelBatch,
    clearHistory,
} = historySlice.actions;

export default historySlice.reducer;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectHistoryContext = (state: RootState, contextId: string) =>
    state.history.contexts[contextId];

export const selectCanUndo = (state: RootState, contextId: string) => {
    const context = state.history.contexts[contextId];
    return context ? context.past.length > 0 : false;
};

export const selectCanRedo = (state: RootState, contextId: string) => {
    const context = state.history.contexts[contextId];
    return context ? context.future.length > 0 : false;
};

export const selectHistorySize = (state: RootState, contextId: string) => {
    const context = state.history.contexts[contextId];
    return context ? context.past.length : 0;
};

export const selectAllCommands = (state: RootState, contextId: string) => {
    const context = state.history.contexts[contextId];
    return context ? context.past : [];
};

export const selectIsBatching = (state: RootState, contextId: string) => {
    const context = state.history.contexts[contextId];
    return context ? context.isBatching : false;
};