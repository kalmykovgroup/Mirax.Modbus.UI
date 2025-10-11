// src/features/chartsPage/charts/core/store/tabsSlice.ts

import { createSlice, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';

// ============= ТИПЫ =============

/**
 * Информация о вкладке
 */
export interface TabInfo {
    readonly id: Guid;
    readonly name: string;
    readonly contextIds: readonly Guid[]; // все контексты в вкладке
    readonly visibleContextIds: readonly Guid[]; // какие контексты показываем (фильтр)
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
                visibleContextIds: [],
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
         * Закрыть вкладку
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

        // ========== УПРАВЛЕНИЕ КОНТЕКСТАМИ ==========

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

            if (tab.contextIds.includes(contextId)) {
                console.warn('[addContextToTab] Context already exists:', { tabId, contextId });
                return;
            }

            const newContextIds = [...tab.contextIds, contextId];
            const newVisibleIds = [...tab.visibleContextIds, contextId]; // автоматически показываем

            state.byId[tabId] = {
                ...tab,
                contextIds: newContextIds,
                visibleContextIds: newVisibleIds,
            };

            console.log('[addContextToTab] Added:', { tabId, contextId });
        },

        /**
         * Удалить контекст из вкладки
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
            const newVisibleIds = tab.visibleContextIds.filter((id) => id !== contextId);

            state.byId[tabId] = {
                ...tab,
                contextIds: newContextIds,
                visibleContextIds: newVisibleIds,
            };

            console.log('[removeContextFromTab] Removed:', { tabId, contextId });
        },

        /**
         * Переключить видимость контекста (для фильтра)
         */
        toggleContextVisibility(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly contextId: Guid;
            }>
        ) {
            const { tabId, contextId } = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[toggleContextVisibility] Tab not found:', tabId);
                return;
            }

            if (!tab.contextIds.includes(contextId)) {
                console.error('[toggleContextVisibility] Context not in tab:', {
                    tabId,
                    contextId,
                });
                return;
            }

            const isVisible = tab.visibleContextIds.includes(contextId);
            const newVisibleIds = isVisible
                ? tab.visibleContextIds.filter((id) => id !== contextId)
                : [...tab.visibleContextIds, contextId];

            state.byId[tabId] = {
                ...tab,
                visibleContextIds: newVisibleIds,
            };

            console.log('[toggleContextVisibility]', {
                tabId,
                contextId,
                nowVisible: !isVisible,
            });
        },

        /**
         * Показать все контексты
         */
        showAllContexts(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[showAllContexts] Tab not found:', tabId);
                return;
            }

            state.byId[tabId] = {
                ...tab,
                visibleContextIds: [...tab.contextIds],
            };
        },

        /**
         * Скрыть все контексты
         */
        hideAllContexts(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[hideAllContexts] Tab not found:', tabId);
                return;
            }

            state.byId[tabId] = {
                ...tab,
                visibleContextIds: [],
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
                visibleContextIds: [],
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
    toggleContextVisibility,
    showAllContexts,
    hideAllContexts,
    clearTabContexts,
    clearAllTabs,
} = tabsSlice.actions;

// ============= СЕЛЕКТОРЫ =============

export const selectTabsState = (state: RootState): TabsState => state.tabs;

export const selectActiveTabId = (state: RootState): Guid | undefined =>
    state.tabs.activeTabId;

export const selectAllTabIds = (state: RootState): readonly Guid[] => state.tabs.allIds;

/**
 * Получить информацию о вкладке
 */
export const selectTabInfo = createSelector(
    [(state: RootState) => state.tabs.byId, (_state: RootState, tabId: Guid) => tabId],
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
 * Получить все контексты вкладки
 */
export const selectTabContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.contextIds ?? []
);

/**
 * Получить видимые контексты (фильтр)
 */
export const selectVisibleContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.visibleContextIds ?? []
);

/**
 * Проверить, видим ли контекст
 */
export const selectIsContextVisible = createSelector(
    [selectTabInfo, (_state: RootState, _tabId: Guid, contextId: Guid) => contextId],
    (tabInfo, contextId): boolean => {
        return tabInfo?.visibleContextIds.includes(contextId) ?? false;
    }
);

/**
 * Получить количество контекстов
 */
export const selectContextCount = createSelector(
    [selectTabContextIds],
    (contextIds): number => contextIds.length
);

/**
 * Проверить, есть ли контексты
 */
export const selectHasContexts = createSelector(
    [selectTabContextIds],
    (contextIds): boolean => contextIds.length > 0
);

/**
 * Получить информацию об активной вкладке
 */
export const selectActiveTabInfo = createSelector(
    [(state: RootState) => state.tabs.byId, selectActiveTabId],
    (byId, activeTabId): TabInfo | undefined => {
        if (activeTabId === undefined) return undefined;
        return byId[activeTabId];
    }
);

/**
 * Все вкладки как массив
 */
export const selectAllTabs = createSelector(
    [(state: RootState) => state.tabs.byId, selectAllTabIds],
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