import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import type {RootState} from "@/baseStore/store.ts";


// ============================================================================
// ТИПЫ (ЭКСПОРТИРУЕМ для использования в других модулях)
// ============================================================================

export type EntityType = 'Step' | 'Branch' | 'StepRelation';
export type ChangeType = 'created' | 'updated' | 'deleted';

export interface EntityChange {
    readonly entityId: string;
    readonly entityType: EntityType;
    readonly changeType: ChangeType;
    readonly timestamp: number;
    readonly previousValue?: unknown;
    readonly currentValue?: unknown;
}

interface ContextChanges {
    readonly [entityId: string]: EntityChange;
}

interface ScenarioChangesState {
    readonly contexts: {
        readonly [contextId: string]: ContextChanges;
    };
}

// ============================================================================
// PAYLOAD TYPES (явная типизация для action.payload)
// ============================================================================

interface AddChangePayload {
    readonly contextId: string;
    readonly change: EntityChange;
}

interface RemoveChangePayload {
    readonly contextId: string;
    readonly entityId: string;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ScenarioChangesState = {
    contexts: {},
};

// ============================================================================
// SLICE
// ============================================================================

const scenarioChangesSlice = createSlice({
    name: 'scenarioChanges',
    initialState,
    reducers: {
        addChange: (state, action: PayloadAction<AddChangePayload>) => {
            const { contextId, change } = action.payload;

            // ВАЛИДАЦИЯ: проверяем наличие обязательных полей
            if (!contextId || !change || !change.entityId) {
                console.error('[scenarioChanges] Invalid payload:', action.payload);
                return;
            }

            // Инициализируем контекст, если нужно
            if (!(contextId in state.contexts)) {
                state.contexts[contextId] = {};
            }

            // Безопасная запись с проверкой
            const context = state.contexts[contextId];
            if (context) {
                context[change.entityId] = change;
            }
        },

        removeChange: (state, action: PayloadAction<RemoveChangePayload>) => {
            const { contextId, entityId } = action.payload;

            // ВАЛИДАЦИЯ
            if (!contextId || !entityId) {
                console.error('[scenarioChanges] Invalid payload:', action.payload);
                return;
            }

            if ('contexts' in state && contextId in state.contexts) {
                const context = state.contexts[contextId];
                if (context && entityId in context) {
                    delete context[entityId];
                }
            }
        },

        clearContext: (state, action: PayloadAction<string>) => {
            const contextId = action.payload;

            if (!contextId) {
                console.error('[scenarioChanges] Invalid contextId');
                return;
            }

            if ('contexts' in state && contextId in state.contexts) {
                delete state.contexts[contextId];
            }
        },

        clearAllChanges: (state) => {
            state.contexts = {};
        },
    },
});

export const { addChange, removeChange, clearContext, clearAllChanges } = scenarioChangesSlice.actions;
export default scenarioChangesSlice.reducer;

// ============================================================================
// КОНСТАНТЫ (для стабильности ссылок)
// ============================================================================

const EMPTY_CONTEXT_CHANGES: ContextChanges = Object.freeze({});
const EMPTY_CHANGES_ARRAY: readonly EntityChange[] = Object.freeze([]);

// ============================================================================
// BASE SELECTORS (простые, без мемоизации)
// ============================================================================

const selectChangesState = (state: RootState): ScenarioChangesState =>
    state.scenarioChanges;

const selectContextsMap = (state: RootState) =>
    selectChangesState(state).contexts;

// ============================================================================
// MEMOIZED SELECTORS (с createSelector)
// ============================================================================

/**
 * Получить изменения конкретного контекста
 * МЕМОИЗИРОВАН — возвращает одну и ту же ссылку, если данные не менялись
 */
export const selectContextChanges = createSelector(
    [
        selectContextsMap,
        (_state: RootState, contextId: string) => contextId,
    ],
    (contexts, contextId): ContextChanges => {
        if (!contextId || !(contextId in contexts)) {
            return EMPTY_CONTEXT_CHANGES;
        }
        return contexts[contextId] ?? EMPTY_CONTEXT_CHANGES;
    }
);

/**
 * Получить массив изменений контекста
 * МЕМОИЗИРОВАН — возвращает одну и ту же ссылку массива
 */
export const selectContextChangesArray = createSelector(
    [selectContextChanges],
    (changes): readonly EntityChange[] => {
        const values = Object.values(changes);
        return values.length === 0 ? EMPTY_CHANGES_ARRAY : values;
    }
);

/**
 * Фильтр изменений по типу сущности
 * ПАРАМЕТРИЗОВАННЫЙ МЕМОИЗИРОВАННЫЙ СЕЛЕКТОР
 */
export const makeSelectChangesByType = () =>
    createSelector(
        [
            selectContextChangesArray,
            (_state: RootState, _contextId: string, entityType: EntityType) => entityType,
        ],
        (changes, entityType): readonly EntityChange[] => {
            const filtered = changes.filter(c => c.entityType === entityType);
            return filtered.length === 0 ? EMPTY_CHANGES_ARRAY : filtered;
        }
    );

/**
 * Проверка наличия изменений
 * МЕМОИЗИРОВАН — возвращает boolean (примитив всегда стабильный)
 */
export const selectHasChanges = createSelector(
    [selectContextChanges],
    (changes): boolean => Object.keys(changes).length > 0
);

/**
 * Количество изменений
 * МЕМОИЗИРОВАН — возвращает number (примитив)
 */
export const selectChangesCount = createSelector(
    [selectContextChanges],
    (changes): number => Object.keys(changes).length
);