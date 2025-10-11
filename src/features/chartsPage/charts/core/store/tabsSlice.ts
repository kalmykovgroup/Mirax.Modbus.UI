// src/features/chartsPage/tabs/store/tabsSlice.ts

import { createSlice, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';

// ============= ТИПЫ =============

/**
 * Информация о вкладке
 * Вкладка = UI-представление, содержащее список контекстов
 */
export interface TabInfo {
    readonly id: Guid;
    readonly name: string;
    readonly contextIds: readonly Guid[]; // список контекстов для отображения
    readonly activeContextId: Guid | undefined; // какой контекст сейчас видим
}

/**
 * Состояние вкладок
 */
export interface TabsState {
    readonly byId: Record<Guid, TabInfo>;
    readonly allIds: readonly Guid[];
    readonly activeTabId: Guid | undefined;
}

// ============= НАЧАЛЬНОЕ СОСТОЯНИЕ =============

const initialState: TabsState = {
    byId: {},
    allIds: [],
    activeTabId: undefined,
};

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

/**
 * Генерация дефолтного имени вкладки
 */
function generateTabName(existingCount: number): string {
    return `Вкладка ${existingCount + 1}`;
}

// ============= SLICE =============

const tabsSlice = createSlice({
    name: 'tabs',
    initialState,
    reducers: {
        // ========== УПРАВЛЕНИЕ ВКЛАДКАМИ ==========

        /**
         * Создать новую вкладку
         */
        createTab(
            state,
            action: PayloadAction<{
                readonly id: Guid;
                readonly name?: string | undefined;
            }>
        ) {
            const { id, name } = action.payload;

            if (id in state.byId) {
                console.warn('[createTab] Tab already exists:', id);
                return;
            }

            const tabName = name ?? generateTabName(state.allIds.length);

            state.byId[id] = {
                id,
                name: tabName,
                contextIds: [],
                activeContextId: undefined,
            };

            state.allIds = [...state.allIds, id];
            state.activeTabId = id;

            console.log('[createTab] Created:', { id, name: tabName });
        },

        /**
         * Установить активную вкладку
         */
        setActiveTab(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;

            if (!(tabId in state.byId)) {
                console.error('[setActiveTab] Tab not found:', tabId);
                return;
            }

            state.activeTabId = tabId;
        },

        /**
         * Закрыть вкладку и удалить её
         * Контексты НЕ удаляются (остаются в contextsSlice)
         */
        closeTab(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;

            if (!(tabId in state.byId)) {
                console.warn('[closeTab] Tab not found:', tabId);
                return;
            }

            delete state.byId[tabId];
            state.allIds = state.allIds.filter((id) => id !== tabId);

            // Если закрыли активную вкладку, переключаемся на другую
            if (state.activeTabId === tabId) {
                state.activeTabId = state.allIds[0];
            }

            console.log('[closeTab] Closed:', tabId);
        },

        /**
         * Переименовать вкладку
         */
        renameTab(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly name: string;
            }>
        ) {
            const { tabId, name } = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[renameTab] Tab not found:', tabId);
                return;
            }

            state.byId[tabId] = { ...tab, name };
        },

        // ========== УПРАВЛЕНИЕ КОНТЕКСТАМИ В ВКЛАДКЕ ==========

        /**
         * Добавить контекст в вкладку
         */
        addContextToTab(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly contextId: Guid;
            }>
        ) {
            const { tabId, contextId } = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[addContextToTab] Tab not found:', tabId);
                return;
            }

            // Проверка на дубликат
            if (tab.contextIds.includes(contextId)) {
                console.warn('[addContextToTab] Context already in tab:', { tabId, contextId });
                return;
            }

            state.byId[tabId] = {
                ...tab,
                contextIds: [...tab.contextIds, contextId],
                activeContextId: contextId, // делаем новый контекст активным
            };

            console.log('[addContextToTab] Added:', { tabId, contextId });
        },

        /**
         * Удалить контекст из вкладки
         * Контекст НЕ удаляется из contextsSlice
         */
        removeContextFromTab(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly contextId: Guid;
            }>
        ) {
            const { tabId, contextId } = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[removeContextFromTab] Tab not found:', tabId);
                return;
            }

            const newContextIds = tab.contextIds.filter((id) => id !== contextId);

            // Если удаляем активный контекст, переключаемся на другой
            let newActiveContextId = tab.activeContextId;
            if (tab.activeContextId === contextId) {
                newActiveContextId = newContextIds[0];
            }

            state.byId[tabId] = {
                ...tab,
                contextIds: newContextIds,
                activeContextId: newActiveContextId,
            };

            console.log('[removeContextFromTab] Removed:', { tabId, contextId });
        },

        /**
         * Установить активный контекст в вкладке
         */
        setActiveContext(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly contextId: Guid;
            }>
        ) {
            const { tabId, contextId } = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[setActiveContext] Tab not found:', tabId);
                return;
            }

            if (!tab.contextIds.includes(contextId)) {
                console.error('[setActiveContext] Context not in tab:', { tabId, contextId });
                return;
            }

            state.byId[tabId] = {
                ...tab,
                activeContextId: contextId,
            };
        },

        /**
         * Очистить все контексты из вкладки
         */
        clearTabContexts(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[clearTabContexts] Tab not found:', tabId);
                return;
            }

            state.byId[tabId] = {
                ...tab,
                contextIds: [],
                activeContextId: undefined,
            };
        },

        // ========== ГЛОБАЛЬНАЯ ОЧИСТКА ==========

        /**
         * Удалить все вкладки
         */
        clearAllTabs(state) {
            state.byId = {};
            state.allIds = [];
            state.activeTabId = undefined;
        },
    },
});

// ============= ЭКСПОРТЫ =============

export const tabsReducer = tabsSlice.reducer;

export const {
    createTab,
    setActiveTab,
    closeTab,
    renameTab,
    addContextToTab,
    removeContextFromTab,
    setActiveContext,
    clearTabContexts,
    clearAllTabs,
} = tabsSlice.actions;

// ============= СЕЛЕКТОРЫ =============

// Базовые селекторы
export const selectTabsState = (state: RootState): TabsState => state.tabs;

export const selectActiveTabId = (state: RootState): Guid | undefined =>
    state.tabs.activeTabId;

export const selectAllTabIds = (state: RootState): readonly Guid[] =>
    state.tabs.allIds;

// Мемоизированные селекторы

/**
 * Получить информацию о вкладке по ID
 */
export const selectTabInfo = createSelector(
    [
        (state: RootState) => state.tabs.byId,
        (_state: RootState, tabId: Guid) => tabId,
    ],
    (byId, tabId): TabInfo | undefined => byId[tabId]
);

/**
 * Получить имя вкладки
 */
export const selectTabName = createSelector(
    [selectTabInfo],
    (tabInfo): string | undefined => tabInfo?.name
);

/**
 * Получить список контекстов в вкладке
 */
export const selectTabContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.contextIds ?? []
);

/**
 * Получить активный контекст в вкладке
 */
export const selectActiveContextId = createSelector(
    [selectTabInfo],
    (tabInfo): Guid | undefined => tabInfo?.activeContextId
);

/**
 * Проверить, есть ли контексты в вкладке
 */
export const selectHasContexts = createSelector(
    [selectTabContextIds],
    (contextIds): boolean => contextIds.length > 0
);

/**
 * Получить количество контекстов в вкладке
 */
export const selectContextCount = createSelector(
    [selectTabContextIds],
    (contextIds): number => contextIds.length
);

/**
 * Получить информацию об активной вкладке
 */
export const selectActiveTabInfo = createSelector(
    [
        (state: RootState) => state.tabs.byId,
        selectActiveTabId,
    ],
    (byId, activeTabId): TabInfo | undefined => {
        if (activeTabId === undefined) return undefined;
        return byId[activeTabId];
    }
);

/**
 * Получить все вкладки как массив
 */
export const selectAllTabs = createSelector(
    [
        (state: RootState) => state.tabs.byId,
        selectAllTabIds,
    ],
    (byId, allIds): readonly TabInfo[] => {
        return allIds.map((id) => byId[id]!);
    }
);

/**
 * Проверить, есть ли открытые вкладки
 */
export const selectHasTabs = createSelector(
    [selectAllTabIds],
    (allIds): boolean => allIds.length > 0
);

/**
 * Получить количество вкладок
 */
export const selectTabsCount = createSelector(
    [selectAllTabIds],
    (allIds): number => allIds.length
);