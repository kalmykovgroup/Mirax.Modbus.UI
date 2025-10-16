// src/features/history/historySlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '@/baseStore/store';
import type {
    HistoryState,
    HistoryContext,
    HistoryConfig,
    HistoryRecord,
    CreateRecord,
    UpdateRecord,
    DeleteRecord,
    Entity,
} from './types';
import { historyRegistry } from './historyRegistry';

const initialState: HistoryState = {
    contexts: {},
};

// ⚡ КЛЮЧЕВОЕ: Thunk для undo (вызываем handlers ВНЕ reducer)
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

        const handler = historyRegistry.getHandler(record.entityType);
        if (!handler) {
            console.error('[historySlice] No handler for entity type:', record.entityType);
            return;
        }

        // ⚡ Применяем откат (handlers вызывают dispatch, но мы ВНЕ reducer)
        if (record.type === 'create') {
            handler.delete(record.entityId);
        } else if (record.type === 'update') {
            handler.revert(record.before);
        } else if (record.type === 'delete') {
            handler.create(record.before);
        }

        // Обновляем историю
        dispatch(undoCommit({ contextId }));
    }
);

// ⚡ КЛЮЧЕВОЕ: Thunk для redo (вызываем handlers ВНЕ reducer)
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

        const handler = historyRegistry.getHandler(record.entityType);
        if (!handler) {
            console.error('[historySlice] No handler for entity type:', record.entityType);
            return;
        }

        // ⚡ Применяем повтор (handlers вызывают dispatch, но мы ВНЕ reducer)
        if (record.type === 'create') {
            handler.create(record.after);
        } else if (record.type === 'update') {
            handler.apply(record.after);
        } else if (record.type === 'delete') {
            handler.delete(record.entityId);
        }

        // Обновляем историю
        dispatch(redoCommit({ contextId }));
    }
);

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
                console.log('[historySlice] Initializing context:', contextId);
                const newContext: HistoryContext = {
                    past: [],
                    present: null,
                    future: [],
                    isRecording: true,
                    isBatching: false,
                    batchBuffer: [],
                    config,
                };
                state.contexts[contextId] = newContext;
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

            const handler = historyRegistry.getHandler(entity.entityType);
            if (!handler) {
                console.error('[historySlice] No handler for entity type:', entity.entityType);
                return;
            }

            const snapshot = handler.createSnapshot(entity);
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
                context.batchBuffer.push(record);
            } else {
                context.past.push(record);
                context.future = [];
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

            const handler = historyRegistry.getHandler(newEntity.entityType);
            if (!handler) {
                console.error('[historySlice] No handler for entity type:', newEntity.entityType);
                return;
            }

            const beforeSnapshot = handler.createSnapshot(previousEntity);
            const afterSnapshot = handler.createSnapshot(newEntity);

            const record: UpdateRecord = {
                id: crypto.randomUUID(),
                type: 'update',
                entityId: newEntity.id,
                entityType: newEntity.entityType,
                timestamp: Date.now(),
                before: beforeSnapshot,
                after: afterSnapshot,
            };

            console.log('[historySlice] Recording update:', record);

            if (context.isBatching) {
                context.batchBuffer.push(record);
            } else {
                context.past.push(record);
                context.future = [];
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

            const handler = historyRegistry.getHandler(entity.entityType);
            if (!handler) {
                console.error('[historySlice] No handler for entity type:', entity.entityType);
                return;
            }

            const snapshot = handler.createSnapshot(entity);
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
                context.batchBuffer.push(record);
            } else {
                context.past.push(record);
                context.future = [];
            }
        },

        // ⚡ ТОЛЬКО перемещение записи в past/future (БЕЗ вызова handlers)
        undoCommit: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (!context || context.past.length === 0) return;

            const record = context.past[context.past.length - 1];
            if (!record) return;

            context.past = context.past.slice(0, -1);
            context.future = [record, ...context.future];

            console.log('[historySlice] Undo committed. Past:', context.past.length, 'Future:', context.future.length);
        },

        // ⚡ ТОЛЬКО перемещение записи в past/future (БЕЗ вызова handlers)
        redoCommit: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (!context || context.future.length === 0) return;

            const record = context.future[0];
            if (!record) return;

            context.past = [...context.past, record];
            context.future = context.future.slice(1);

            console.log('[historySlice] Redo committed. Past:', context.past.length, 'Future:', context.future.length);
        },

        startBatch: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (context) {
                context.isBatching = true;
                context.batchBuffer = [];
            }
        },

        commitBatch: (
            state,
            action: PayloadAction<{ contextId: string; description?: string }>
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

                context.past.push(batchRecord);
                context.future = [];
            }

            context.isBatching = false;
            context.batchBuffer = [];
        },

        cancelBatch: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (context) {
                context.isBatching = false;
                context.batchBuffer = [];
            }
        },

        clearHistory: (state, action: PayloadAction<{ contextId: string }>) => {
            const { contextId } = action.payload;
            const context = state.contexts[contextId];

            if (context) {
                context.past = [];
                context.future = [];
                context.batchBuffer = [];
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

// Селекторы
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