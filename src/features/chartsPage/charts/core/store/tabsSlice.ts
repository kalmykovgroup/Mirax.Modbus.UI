// src/features/chartsPage/charts/core/store/tabsSlice.ts
// ИСПРАВЛЕНИЕ: Добавлены константы для пустых массивов

import { createSlice, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { Guid } from '@app/lib/types/Guid';
import type { RootState } from '@/store/store';

// ============= КОНСТАНТЫ =============

/**
 *  КРИТИЧНО: Константы для пустых массивов
 * Предотвращают создание новых массивов при каждом вызове селектора
 */
const EMPTY_CONTEXT_IDS: readonly Guid[] = Object.freeze([]);

// ============= ТИПЫ =============

export interface TabInfo {
    readonly id: Guid;
    readonly name: string;
    readonly contextIds: readonly Guid[];
    readonly visibleContextIds: readonly Guid[];
    readonly syncEnabled: boolean;
    readonly syncContextIds: readonly Guid[];
}

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
                console.error('[closeTab] Tab not found:', tabId);
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

            state.byId[tabId] = {
                ...tab,
                name,
            };
        },

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
                console.warn('[addContextToTab] Context already in tab:', { tabId, contextId });
                return;
            }

            state.byId[tabId] = {
                ...tab,
                contextIds: [...tab.contextIds, contextId],
                visibleContextIds: [...tab.visibleContextIds, contextId],
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

            state.byId[tabId] = {
                ...tab,
                contextIds: tab.contextIds.filter((id) => id !== contextId),
                visibleContextIds: tab.visibleContextIds.filter((id) => id !== contextId),
                syncContextIds: tab.syncContextIds.filter((id) => id !== contextId),
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
                syncContextIds: newSyncEnabled ? tab.syncContextIds : [],
            };

            console.log('[toggleTabSync]', { tabId, syncEnabled: newSyncEnabled });
        },

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

            state.byId[tabId] = {
                ...tab,
                syncContextIds: [...tab.syncContextIds, contextId],
            };

            console.log('[addSyncContext] Added:', { tabId, contextId });
        },

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

            state.byId[tabId] = {
                ...tab,
                syncContextIds: tab.syncContextIds.filter((id) => id !== contextId),
            };

            console.log('[removeSyncContext] Removed:', { tabId, contextId });
        },

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

//  ИСПРАВЛЕНИЕ: Используем константу вместо создания нового массива
export const selectTabContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.contextIds ?? EMPTY_CONTEXT_IDS
);

//  ИСПРАВЛЕНИЕ: Используем константу вместо создания нового массива
export const selectVisibleContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.visibleContextIds ?? EMPTY_CONTEXT_IDS
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

export const selectTabSyncEnabled = createSelector(
    [selectTabInfo],
    (tabInfo): boolean => tabInfo?.syncEnabled ?? false
);

//  ИСПРАВЛЕНИЕ: Используем константу вместо создания нового массива
export const selectTabSyncContextIds = createSelector(
    [selectTabInfo],
    (tabInfo): readonly Guid[] => tabInfo?.syncContextIds ?? EMPTY_CONTEXT_IDS
);

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

export const selectTabSyncContextsCount = createSelector(
    [selectTabSyncContextIds],
    (syncContextIds): number => syncContextIds.length
);