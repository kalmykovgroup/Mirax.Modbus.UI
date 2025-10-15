/**
 * ФАЙЛ: src/store/changes/changesSlice.ts
 *
 * Универсальный Redux slice для отслеживания изменений любых сущностей
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
    ChangeAction,
    ChangesContext,
    ChangesState,
    Entity,
    EntityChange
} from '@scenario/core/scenarioChangeCenter/types';
import storage from 'redux-persist/lib/storage';
import { persistReducer } from 'redux-persist';
import type {RootState} from "@/baseStore/store.ts";

const initialState: ChangesState = {
    contexts: {},
};

export const scenarioChangesSlice = createSlice({
    name: 'scenarioChanges',
    initialState,
    reducers: {
        /**
         * Добавить изменение в контекст
         */
        addChange: <T extends Entity>(
            state: ChangesState,
            action: PayloadAction<{
                contextId: string;
                entityType: string;
                entity: T;
                action: ChangeAction;
                original?: T | undefined;
            }>
        ) => {
            const { contextId, entityType, entity, action: changeAction, original } = action.payload;

            console.log('🟢 addChange reducer вызван:', {
                contextId,
                entityType,
                entityId: entity.id,
                action: changeAction,
            });

            // Инициализируем контекст если нужно (noUncheckedIndexedAccess)
            const existingContext = state.contexts[contextId];
            if (existingContext === undefined) {
                console.log('📦 Создаём новый контекст:', contextId);
                state.contexts[contextId] = {
                    contextId,
                    changes: {},
                };
            }

            // Теперь context точно не undefined
            const context = state.contexts[contextId];
            if (context === undefined) return; // type guard для TS

            const key = `${entityType}:${entity.id}`;
            const existing = context.changes[key]; // может быть undefined

            console.log('🔑 Ключ изменения:', key, existing !== undefined ? 'найдено существующее' : 'новое');

            const newChange: EntityChange<T> = {
                id: crypto.randomUUID(),
                entityType,
                entityId: entity.id,
                action: changeAction,
                timestamp: Date.now(),
                original: changeAction === 'create' ? undefined : (original ?? existing?.original),
                current: changeAction === 'delete' ? undefined : entity,
            };

            // Оптимизация: если есть предыдущее изменение
            if (existing !== undefined) {
                const optimized = optimizePair(existing as EntityChange<T>, newChange);

                if (optimized === null) {
                    console.log('🗑️ Изменение оптимизировано в null (create+delete)');
                    // Взаимно уничтожились (create+delete)
                    const { [key]: _removed, ...rest } = context.changes;
                    context.changes = rest;
                } else {
                    console.log('⚡ Изменение оптимизировано:', optimized.action);
                    context.changes = {
                        ...context.changes,
                        [key]: optimized,
                    };
                }
            } else {
                console.log('➕ Добавляем новое изменение');
                context.changes = {
                    ...context.changes,
                    [key]: newChange,
                };
            }

            console.log('📊 Текущее состояние context.changes:', Object.keys(context.changes).length, 'изменений');
        },

        /**
         * Очистить изменения контекста
         */
        clearContext: (state: ChangesState, action: PayloadAction<string>) => {
            const contextId = action.payload;
            console.log('🧹 clearContext вызван:', contextId);
            const { [contextId]: _removed, ...rest } = state.contexts;
            state.contexts = rest;
        },

        /**
         * Удалить конкретное изменение
         */
        removeChange: (
            state: ChangesState,
            action: PayloadAction<{ contextId: string; key: string }>
        ) => {
            const { contextId, key } = action.payload;
            console.log('❌ removeChange вызван:', { contextId, key });
            const context = state.contexts[contextId];

            if (context !== undefined) {
                const { [key]: _removed, ...rest } = context.changes;
                context.changes = rest;
            }
        },

        /**
         * Очистить все контексты
         */
        clearAll: (state: ChangesState) => {
            console.log('💥 clearAll вызван');
            state.contexts = {};
        },
    },
});

/**
 * Оптимизирует две последовательные операции над одной сущностью
 */
function optimizePair<T extends Entity>(
    first: EntityChange<T>,
    second: EntityChange<T>
): EntityChange<T> | null {
    // CREATE + DELETE = null (создали и сразу удалили)
    if (first.action === 'create' && second.action === 'delete') {
        return null;
    }

    // CREATE + UPDATE = CREATE с новыми данными
    if (first.action === 'create' && second.action === 'update') {
        return {
            ...second,
            action: 'create',
            original: undefined,
        };
    }

    // UPDATE + UPDATE = UPDATE с последними данными
    if (first.action === 'update' && second.action === 'update') {
        return {
            ...second,
            original: first.original,
        };
    }

    // UPDATE + DELETE = DELETE с сохранением original
    if (first.action === 'update' && second.action === 'delete') {
        return {
            ...second,
            original: first.original,
        };
    }

    // DELETE + CREATE = UPDATE (удалили и создали заново)
    if (first.action === 'delete' && second.action === 'create') {
        return {
            ...second,
            action: 'update',
            original: first.original,
        };
    }

    return second;
}

// Actions
export const { addChange, clearContext, removeChange, clearAll } = scenarioChangesSlice.actions;

// Selectors
export const selectChangesState = (state: RootState): ChangesState => {
    console.log('🔍 selectChangesState вызван, contexts:', Object.keys(state.scenarioChanges.contexts));
    return state.scenarioChanges;
};

export const selectContextChanges = (contextId: string) => (state: RootState): ChangesContext | undefined => {
    const context = state.scenarioChanges.contexts[contextId];
    console.log(`🔍 selectContextChanges("${contextId}"):`, context !== undefined ? 'найден' : 'НЕ НАЙДЕН');
    return context;
};

export const selectContextChangesArray = (contextId: string) => (state: RootState): readonly EntityChange[] => {
    const context = state.scenarioChanges.contexts[contextId];
    console.log(`🔍 selectContextChangesArray("${contextId}"):`, {
        contextFound: context !== undefined,
        changesCount: context !== undefined ? Object.keys(context.changes).length : 0,
    });
    if (context === undefined) return [];
    return Object.values(context.changes);
};

export const selectHasChanges = (contextId: string) => (state: RootState): boolean => {
    const context = state.scenarioChanges.contexts[contextId];
    const result = context !== undefined && Object.keys(context.changes).length > 0;
    console.log(`🔍 selectHasChanges("${contextId}"):`, result);
    return result;
};

export const selectChangesCount = (contextId: string) => (state: RootState): number => {
    const context = state.scenarioChanges.contexts[contextId];
    const count = context !== undefined ? Object.keys(context.changes).length : 0;
    console.log(`🔍 selectChangesCount("${contextId}"):`, count);
    return count;
};

const slice = scenarioChangesSlice.reducer;

// Конфигурация persist для изменений
const changesPersistConfig = {
    key: 'scenarioChanges',
    storage,
    whitelist: ['contexts'] as const,
};

export const persistedChangesReducer = persistReducer(
    changesPersistConfig,
    slice
);