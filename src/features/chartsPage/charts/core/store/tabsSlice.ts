// src/features/chartsPage/charts/core/store/tabsSlice.ts

import { createSlice, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';

// ============= ТИПЫ =============

/**
 * Информация о вкладке
 * Хранит только список контекстов, участвующих в синхронизации
 */
export interface TabInfo {
    readonly id: Guid;
    readonly name: string;
    readonly contextIds: readonly Guid[];
    readonly visibleContextIds: readonly Guid[];

    // ========== СИНХРОНИЗАЦИЯ НА УРОВНЕ ВКЛАДКИ ==========
    readonly syncEnabled: boolean;
    readonly syncContextIds: readonly Guid[]; // какие КОНТЕКСТЫ участвуют в синхронизации
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
                syncEnabled: false,
                syncContextIds: [],
            };

            state.allIds = [...state.allIds, id];
            state.activeTabId = id;

            console.log('[createTab] Created:', { id, name: tabName });
        },

        setActiveTab(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;

            if (!(tabId in state.byId)) {
                console.error('[setActiveTab] Tab not found:', tabId);
                return;
            }

            state.activeTabId = tabId;
        },

        closeTab(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;

            if (!(tabId in state.byId)) {
                console.warn('[closeTab] Tab not found:', tabId);
                return;
            }

            delete state.byId[tabId];
            state.allIds = state.allIds.filter((id) => id !== tabId);

            if (state.activeTabId === tabId) {
                state.activeTabId = state.allIds[0];
            }

            console.log('[closeTab] Closed:', tabId);
        },

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
            const newVisibleIds = [...tab.visibleContextIds, contextId];

            state.byId[tabId] = {
                ...tab,
                contextIds: newContextIds,
                visibleContextIds: newVisibleIds,
            };

            console.log('[addContextToTab] Added:', { tabId, contextId });
        },

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

            // Удаляем контекст из синхронизации
            const newSyncContextIds = tab.syncContextIds.filter((id) => id !== contextId);

            state.byId[tabId] = {
                ...tab,
                contextIds: newContextIds,
                visibleContextIds: newVisibleIds,
                syncContextIds: newSyncContextIds,
            };

            console.log('[removeContextFromTab] Removed:', { tabId, contextId });
        },

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
                syncContextIds: [],
            };
        },

        // ========== СИНХРОНИЗАЦИЯ ==========

        /**
         * Переключить режим синхронизации для вкладки
         */
        toggleTabSync(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[toggleTabSync] Tab not found:', tabId);
                return;
            }

            const newSyncEnabled = !tab.syncEnabled;

            state.byId[tabId] = {
                ...tab,
                syncEnabled: newSyncEnabled,
                // Если отключаем синхронизацию - очищаем список контекстов
                syncContextIds: newSyncEnabled ? tab.syncContextIds : [],
            };

            console.log('[toggleTabSync]', { tabId, syncEnabled: newSyncEnabled });
        },

        /**
         * Добавить контекст в синхронизацию вкладки
         * Вызывается автоматически при добавлении первого поля контекста
         */
        addSyncContext(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly contextId: Guid;
            }>
        ) {
            const { tabId, contextId } = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[addSyncContext] Tab not found:', tabId);
                return;
            }

            if (tab.syncContextIds.includes(contextId)) {
                console.warn('[addSyncContext] Context already synced:', { tabId, contextId });
                return;
            }

            const newSyncContextIds = [...tab.syncContextIds, contextId];

            state.byId[tabId] = {
                ...tab,
                syncContextIds: newSyncContextIds,
            };

            console.log('[addSyncContext] Added:', { tabId, contextId });
        },

        /**
         * Удалить контекст из синхронизации вкладки
         * Вызывается автоматически при удалении последнего поля контекста
         */
        removeSyncContext(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly contextId: Guid;
            }>
        ) {
            const { tabId, contextId } = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[removeSyncContext] Tab not found:', tabId);
                return;
            }

            const newSyncContextIds = tab.syncContextIds.filter((id) => id !== contextId);

            state.byId[tabId] = {
                ...tab,
                syncContextIds: newSyncContextIds,
            };

            console.log('[removeSyncContext] Removed:', { tabId, contextId });
        },

        /**
         * Очистить все контексты синхронизации вкладки
         */
        clearTabSyncContexts(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;
            const tab = state.byId[tabId];

            if (!tab) {
                console.error('[clearTabSyncContexts] Tab not found:', tabId);
                return;
            }

            state.byId[tabId] = {
                ...tab,
                syncContextIds: [],
            };

            console.log('[clearTabSyncContexts]', { tabId });
        },

        // ========== ГЛОБАЛЬНАЯ ОЧИСТКА ==========

        clearAllTabs(state) {
            state.byId = {};
            state.allIds = [];
            state.activeTabId = undefined;
        },
    },
});

// ============= ЭКСПОРТЫ ACTIONS =============

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
    // Синхронизация
    toggleTabSync,
    addSyncContext,
    removeSyncContext,
    clearTabSyncContexts,
} = tabsSlice.actions;

// ============= СЕЛЕКТОРЫ =============

export const selectTabsState = (state: RootState): TabsState => state.tabs;

export const selectActiveTabId = (state: RootState): Guid | undefined =>
    state.tabs.activeTabId;

export const selectAllTabIds = (state: RootState): readonly Guid[] => state.tabs.allIds;

export const selectTabInfo = createSelector(
    [(state: RootState) => state.tabs.byId, (_state: RootState, tabId: Guid) => tabId],
    (byId, tabId): TabInfo | undefined => byId[tabId]
);

export const selectTabName = createSelector(
    [selectTabInfo],
    (tabInfo): string | undefined => tabInfo?.name
);

export const selectTabContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.contextIds ?? []
);

export const selectVisibleContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.visibleContextIds ?? []
);

export const selectIsContextVisible = createSelector(
    [selectTabInfo, (_state: RootState, _tabId: Guid, contextId: Guid) => contextId],
    (tabInfo, contextId): boolean => {
        return tabInfo?.visibleContextIds.includes(contextId) ?? false;
    }
);

export const selectContextCount = createSelector(
    [selectTabContextIds],
    (contextIds): number => contextIds.length
);

export const selectHasContexts = createSelector(
    [selectTabContextIds],
    (contextIds): boolean => contextIds.length > 0
);

export const selectActiveTabInfo = createSelector(
    [(state: RootState) => state.tabs.byId, selectActiveTabId],
    (byId, activeTabId): TabInfo | undefined => {
        if (activeTabId === undefined) return undefined;
        return byId[activeTabId];
    }
);

export const selectAllTabs = createSelector(
    [(state: RootState) => state.tabs.byId, selectAllTabIds],
    (byId, allIds): readonly TabInfo[] => {
        return allIds.map((id) => byId[id]!);
    }
);

export const selectHasTabs = createSelector(
    [selectAllTabIds],
    (allIds): boolean => allIds.length > 0
);

export const selectTabsCount = createSelector(
    [selectAllTabIds],
    (allIds): number => allIds.length
);

// ========== СЕЛЕКТОРЫ СИНХРОНИЗАЦИИ ==========

/**
 * Включена ли синхронизация для вкладки
 */
export const selectTabSyncEnabled = createSelector(
    [selectTabInfo],
    (tabInfo): boolean => tabInfo?.syncEnabled ?? false
);

/**
 * Получить все контексты, участвующие в синхронизации
 */
export const selectTabSyncContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.syncContextIds ?? []
);

/**
 * Проверить, участвует ли контекст в синхронизации
 */
export const selectIsContextSynced = createSelector(
    [
        selectTabInfo,
        (_state: RootState, _tabId: Guid, contextId: Guid) => contextId,
    ],
    (tabInfo, contextId): boolean => {
        if (!tabInfo) return false;
        return tabInfo.syncContextIds.includes(contextId);
    }
);

/**
 * Количество синхронизированных контекстов
 */
export const selectTabSyncContextsCount = createSelector(
    [selectTabSyncContextIds],
    (syncContextIds): number => syncContextIds.length
);