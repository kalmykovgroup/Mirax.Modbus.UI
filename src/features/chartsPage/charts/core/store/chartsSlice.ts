// src/features/chartsPage/charts/core/store/chartsSlice.ts

import {createSelector, createSlice, type PayloadAction} from '@reduxjs/toolkit';
import { type LoadingState, LoadingType } from '@chartsPage/charts/core/store/types/loading.types';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto.ts';
import type { ResolvedCharReqTemplate } from '@chartsPage/template/shared/dtos/ResolvedCharReqTemplate.ts';
import type { SeriesBinDto } from '@chartsPage/charts/core/dtos/SeriesBinDto.ts';
import type {
    BucketsMs,
    CoverageInterval,
    FieldName,
    FieldView,
    OriginalRange,
    SeriesTile,
    TimeRange,
} from '@chartsPage/charts/core/store/types/chart.types.ts';
import type { Guid } from '@app/lib/types/Guid';
import type {RootState} from "@/store/store.ts";

// ============= ТИПЫ =============

/**
 * Состояние графиков для одной вкладки (прежняя ChartsState)
 */
export interface TabChartsState {
    syncEnabled: boolean;
    syncFields: readonly FieldDto[];
    template: ResolvedCharReqTemplate | undefined;
    readonly view: Record<FieldName, FieldView>;
    isDataLoaded: boolean;
}

/**
 * Глобальное состояние с поддержкой множественных вкладок
 */
export interface ChartsState {
    readonly byTab: Record<Guid, TabChartsState>;
    readonly activeTabId: Guid | undefined;
}

// ============= НАЧАЛЬНОЕ СОСТОЯНИЕ =============

const initialTabState: TabChartsState = {
    syncEnabled: false,
    syncFields: [],
    template: undefined,
    view: {},
    isDataLoaded: false,
};

const initialState: ChartsState = {
    byTab: {},
    activeTabId: undefined,
};

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

/**
 * Безопасное получение состояния вкладки с автоинициализацией
 */
function getOrCreateTab(state: ChartsState, tabId: Guid): TabChartsState {
    if (!(tabId in state.byTab)) {
        state.byTab[tabId] = {
            syncEnabled: false,
            syncFields: [],
            template: undefined,
            view: {},
            isDataLoaded: false,
        };
    }
    return state.byTab[tabId]!;
}

// ============= SLICE =============

const chartsSlice = createSlice({
    name: 'charts',
    initialState,
    reducers: {
        // ========== УПРАВЛЕНИЕ ВКЛАДКАМИ ==========

        /**
         * Установить активную вкладку (с автоинициализацией)
         */
        setActiveTab(state, action: PayloadAction<Guid>) {
            state.activeTabId = action.payload;
            getOrCreateTab(state, action.payload);
        },

        /**
         * Закрыть вкладку и удалить её состояние
         */
        closeTab(state, action: PayloadAction<Guid>) {
            const tabId = action.payload;
            delete state.byTab[tabId];
            if (state.activeTabId === tabId) {
                state.activeTabId = undefined;
            }
        },

        /**
         * Очистить состояние вкладки без удаления
         */
        clearTab(state, action: PayloadAction<Guid>) {

            if(state.byTab[action.payload] == undefined){
                console.error("Вкладка не существует")
                return;
            }

            state.byTab[action.payload] = { ...initialTabState };
        },

        // ========== ИНИЦИАЛИЗАЦИЯ ==========

        /**
         * Устанавливает resolved template и создаёт/обновляет вкладку
         * Используется при выполнении шаблона из ChartTemplatesPanel
         */
        setResolvedCharReqTemplate(
            state,
            action: PayloadAction<ResolvedCharReqTemplate>
        ) {
            const template = action.payload;
            const tabId = template.id; // ID шаблона = ID вкладки

            console.log('[setResolvedCharReqTemplate] Создаём/обновляем вкладку:', tabId);

            // Создаём вкладку если её нет
            if (!(tabId in state.byTab)) {
                state.byTab[tabId] = {
                    template,
                    view: {},
                    syncEnabled: false,
                    syncFields: [],
                    isDataLoaded: false,
                };
            } else {
                // Обновляем template существующей вкладки
                state.byTab[tabId]!.template = template;
            }

            // Делаем вкладку активной
            state.activeTabId = tabId;
        },

        // ========== УПРАВЛЕНИЕ ТАЙЛАМИ ==========

        IniTopTile(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                field: FieldName;
                bucketMs: BucketsMs;
                tile: SeriesTile;
            }>
        ) {
            const { tabId, field, bucketMs, tile } = action.payload;

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) {
                console.error('[IniTopTile] Tab not found:', tabId);
                return;
            }

            const view = tab.view[field]; // ← ИЗМЕНИЛИ
            if (!view) {
                console.error('[IniTopTile] View not found for field:', field);
                return;
            }

            view.seriesLevel[bucketMs]?.push(tile);
        },

        // ========== УПРАВЛЕНИЕ VIEW ==========

        initialDataView(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                field: FieldName;
                px: number;
                currentRange: TimeRange;
                originalRange: OriginalRange;
                currentBucketsMs: BucketsMs;
                seriesLevels: readonly BucketsMs[];
                error?: string | undefined;
            }>
        ) {
            const { tabId, field, px, currentRange, originalRange, currentBucketsMs, seriesLevels, error } = action.payload;

            if(tabId == undefined) {
                console.error('[initialViews] Tab not found:', tabId);
                return;
            }

            const tab = state.byTab[tabId];
            if (!tab) {
                console.error('[initialDataView] Tab not found:', tabId);
                return;
            }

            const seriesLevel: Record<BucketsMs, SeriesTile[]> = {};
            for (const bucket of seriesLevels) {
                seriesLevel[bucket] = [];
            }

            tab.view[field] = {
                originalRange,
                currentRange,
                currentBucketsMs,
                seriesLevel,
                px,
                loadingState: { active: false, type: LoadingType.Initial, progress: 0, startTime: 0 },
                error,
            };

            console.log('Инициализация данных для view прошла успешно', field, tabId);
        },

        initialViews(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                px: number;
                fields: readonly FieldDto[];
            }>
        ) {
            const { tabId, px, fields } = action.payload;

            if(tabId == undefined) {
                console.error('[initialViews] Tab not found:', tabId);
                return;
            }

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) {
                console.error('[initialViews] Tab not found:', tabId);
                return;
            }

            fields.forEach((field) => {
                if (!(field.name in tab.view)) {
                    tab.view[field.name] = {
                        originalRange: undefined,
                        currentRange: undefined,
                        currentBucketsMs: undefined,
                        seriesLevel: {},
                        px,
                        loadingState: { active: false, type: LoadingType.Initial, progress: 0, startTime: 0 },
                    };
                    console.log('Инициализация view прошла успешно', field, tabId);
                }
            });
        },

        updateView(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                field: FieldName;
                px: number;
            }>
        ) {
            const { tabId, field, px } = action.payload;

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) return;

            const view = tab.view[field]; // ← ИЗМЕНИЛИ
            if (view) {
                view.px = px;
            }
        },

        setViewRange(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                field: FieldName;
                range: TimeRange;
            }>
        ) {
            const { tabId, field, range } = action.payload;

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) return;

            const view = tab.view[field]; // ← ИЗМЕНИЛИ
            if (view) {
                view.currentRange = range;
            }
        },

        setViewBucket(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                field: FieldName;
                bucketMs: BucketsMs;
            }>
        ) {
            const { tabId, field, bucketMs } = action.payload;

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) return;

            const view = tab.view[field]; // ← ИЗМЕНИЛИ
            if (view) {
                view.currentBucketsMs = bucketMs;
            }
        },

        // ========== УПРАВЛЕНИЕ ЗАГРУЗКОЙ ==========

        setLoadingState(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                field: FieldName;
                loadingState: LoadingState;
            }>
        ) {
            const { tabId, field, loadingState } = action.payload;

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) return;

            const view = tab.view[field]; // ← ИЗМЕНИЛИ
            if (view) {
                view.loadingState = loadingState;
            }
        },

        startLoadingFields(
            state,
            action: PayloadAction<{
                tabId: Guid;
                fields: readonly FieldDto[];
                type: LoadingType;
                messageError: string;
            }>
        ) {
            const { tabId, fields, type, messageError} = action.payload;

            const tab = state.byTab[tabId];
            if (!tab) {
                console.error('[startLoadingFields] Tab not found:', tabId);
                return;
            }

            fields.forEach((field) => {
                const view = tab.view[field.name];
                if (!view) {
                    console.warn('[startLoadingFields] View not found for field:', field.name);
                    return;
                }
                view.loadingState = {
                    active: true,
                    type,
                    progress: 0,
                    startTime: Date.now(),
                    message: messageError
                };
                view.error = undefined;
            });
        },

        startLoading(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                field: FieldName;
                type: LoadingType;
                message: string | undefined;
            }>
        ) {
            const { tabId, field, type, message } = action.payload;

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) return;

            const view = tab.view[field]; // ← ИЗМЕНИЛИ
            if (view) {
                view.loadingState = {
                    active: true,
                    type,
                    progress: 0,
                    startTime: Date.now(),
                    message
                } as LoadingState;
                view.error = undefined;
            }
        },

        updateLoadingProgress(
            state,
            action: PayloadAction<{
                tabId: Guid;
                field: FieldName;
                progress: number;
                message: string | undefined;
            }>
        ) {
            const { tabId, field, progress, message } = action.payload;

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) return;

            const view = tab.view[field]; // ← ИЗМЕНИЛИ
            if (view && view.loadingState.active) {
                view.loadingState.progress = progress;
                view.loadingState.message = message;
            }
        },

        finishLoadings(
            state,
            action: PayloadAction<{
                tabId: Guid;
                fields: readonly FieldDto[];
                success: boolean;
                messageError?: string | undefined;
            }>
        ) {
            const { tabId, fields, success, messageError } = action.payload;

            const tab = state.byTab[tabId];
            if (!tab) {
                console.error('[finishLoadings] Tab not found:', tabId);
                return;
            }

            fields.forEach((field) => {
                const view = tab.view[field.name];
                if (!view) {
                    console.warn('[finishLoadings] View not found for field:', field.name);
                    return;
                }
                view.loadingState = {
                    active: false,
                    type: LoadingType.Initial,
                    progress: 100,
                    startTime: 0,
                    message: messageError,
                    success: success
                } as LoadingState;
            });
        },

        finishLoading(
            state,
            action: PayloadAction<{
                tabId: Guid;
                field: FieldName;
                success: boolean;
                message: string | undefined;
            }>
        ) {
            const { tabId, field, success, message } = action.payload;

            const tab = state.byTab[tabId];
            if (!tab) return;

            const view = tab.view[field];
            if (view) {
                view.loadingState = {
                    active: false,
                    type: LoadingType.Initial,
                    progress: success ? 100 : 0,
                    startTime: 0,
                    message: message
                };
            }
        },

        // ========== УПРАВЛЕНИЕ ОШИБКАМИ ==========

        setFieldError(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ТОЛЬКО ДОБАВИЛИ
                fieldName: FieldName;
                errorMessage?: string | undefined;
            }>
        ) {
            const { tabId, fieldName, errorMessage } = action.payload;

            const tab = state.byTab[tabId];
            if (!tab) return;

            const view = tab.view[fieldName];
            if (view) {
                view.error = errorMessage;
            }
        },

        clearFieldError(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ТОЛЬКО ДОБАВИЛИ
                fieldName: FieldName;
            }>
        ) {
            const { tabId, fieldName } = action.payload;

            const tab = state.byTab[tabId];
            if (!tab) return;

            const view = tab.view[fieldName];
            if (view) {
                view.error = undefined;
            }
        },

        // ========== УПРАВЛЕНИЕ ЗАПРОСАМИ ==========

        registerRequest(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly field: FieldName;
                readonly bucketMs: BucketsMs;
                readonly interval: CoverageInterval;
                readonly requestId: string;
            }>
        ) {
            const { tabId, field, bucketMs, interval, requestId } = action.payload;
            const tab = getOrCreateTab(state, tabId);
            const view = tab.view[field];

            if (!view) throw Error('view для поля ' + field + ' не найден');

            if (!view.seriesLevel[bucketMs]) {
                view.seriesLevel[bucketMs] = [];
            }

            view.seriesLevel[bucketMs]!.push({
                coverageInterval: interval,
                bins: [],
                status: 'loading',
                requestId: requestId,
            });
        },

        completeRequest(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly field: FieldName;
                readonly bucketMs: BucketsMs;
                readonly requestId: string;
                readonly bins: SeriesBinDto[];
            }>
        ) {
            const { tabId, field, bucketMs, requestId, bins } = action.payload;
            const tab = getOrCreateTab(state, tabId);
            const view = tab.view[field];

            if (!view) {
                console.error(`[completeRequest] View not found for field: ${field}`);
                return;
            }

            const tiles = view.seriesLevel[bucketMs];
            if (!tiles) return;

            const tile = tiles.find((t) => t.requestId === requestId);
            if (tile) {
                tile.bins = bins;
                tile.status = 'ready';
                tile.loadedAt = Date.now();
                delete tile.requestId;
            }
        },

        failRequest(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly field: FieldName;
                readonly bucketMs: BucketsMs;
                readonly requestId: string;
                readonly error: string;
            }>
        ) {
            const { tabId, field, bucketMs, requestId, error } = action.payload;
            const tab = getOrCreateTab(state, tabId);
            const view = tab.view[field];

            if (!view) {
                console.error(`[failRequest] View not found for field: ${field}`);
                return;
            }

            const tiles = view.seriesLevel[bucketMs];
            if (!tiles) return;

            const tile = tiles.find((t) => t.requestId === requestId);
            if (tile) {
                tile.status = 'error';
                tile.error = error;
                delete tile.requestId;
            }
        },

        // ========== СИНХРОНИЗАЦИЯ ==========

        toggleSync(state, action: PayloadAction<Guid>) {
            const tab = getOrCreateTab(state, action.payload);
            tab.syncEnabled = !tab.syncEnabled;
        },

        addSyncField(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly field: FieldDto;
            }>
        ) {
            const { tabId, field } = action.payload;
            const tab = getOrCreateTab(state, tabId);
            const exists = tab.syncFields.some((f) => f.name === field.name);
            if (!exists) {
                tab.syncFields = [...tab.syncFields, field];
            }
        },

        removeSyncField(
            state,
            action: PayloadAction<{
                readonly tabId: Guid;
                readonly fieldName: string;
            }>
        ) {
            const { tabId, fieldName } = action.payload;
            const tab = getOrCreateTab(state, tabId);
            tab.syncFields = tab.syncFields.filter((f) => f.name !== fieldName);
        },

        clearSyncFields(state, action: PayloadAction<Guid>) {
            const tab = getOrCreateTab(state, action.payload);
            tab.syncFields = [];
        },

        // ========== ГЛОБАЛЬНЫЕ ОПЕРАЦИИ ==========

        setIsDataLoaded(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ТОЛЬКО ДОБАВИЛИ
                isLoaded: boolean;
            }>
        ) {
            const { tabId, isLoaded } = action.payload;

            const tab = state.byTab[tabId];
            if (tab) {
                tab.isDataLoaded = isLoaded;
            }
        },

        setPx(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ТОЛЬКО ДОБАВИЛИ
                px: number;
            }>
        ) {
            const { tabId, px } = action.payload;

            const tab = state.byTab[tabId];
            if (!tab) return;

            Object.values(tab.view).forEach((view) => {
                view.px = px;
            });
        },

        // ========== ОЧИСТКА ==========

        clearField(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ТОЛЬКО ДОБАВИЛИ
                fieldName: FieldName;
            }>
        ) {
            const { tabId, fieldName } = action.payload;

            const tab = state.byTab[tabId];
            if (tab) {
                delete tab.view[fieldName];
            }
        },

// clearAll остаётся БЕЗ tabId - очищает ВСЁ
        clearAll(state) {
            state.activeTabId = undefined;
            state.byTab = {};
        },

        // ========== BATCH ОПЕРАЦИИ ==========

        batchUpdateTiles(
            state,
            action: PayloadAction<{
                tabId: Guid; // ← ДОБАВИЛИ
                updates: Array<{
                    field: FieldName;
                    bucketMs: BucketsMs;
                    tiles: SeriesTile[];
                }>;
            }>
        ) {
            const { tabId, updates } = action.payload;

            const tab = state.byTab[tabId]; // ← ДОБАВИЛИ
            if (!tab) {
                console.error('[batchUpdateTiles] Tab not found:', tabId);
                return;
            }

            updates.forEach((update) => {
                const view = tab.view[update.field]; // ← ИЗМЕНИЛИ

                if (!view) {
                    console.error('[batchUpdateTiles] View not found for field:', update.field);
                    return;
                }

                view.seriesLevel[update.bucketMs] = update.tiles;
            });
        },

    },
});

// ============= ЭКСПОРТЫ =============

export const chartsReducer = chartsSlice.reducer;

export const {
    // Управление вкладками
    setActiveTab,
    closeTab,
    clearTab,

    // Инициализация
    setResolvedCharReqTemplate,

    // Управление тайлами
    IniTopTile,

    // Управление view
    initialDataView,
    initialViews,
    updateView,
    setViewRange,
    setViewBucket,

    // Управление загрузкой
    setLoadingState,
    startLoading,
    startLoadingFields,
    updateLoadingProgress,
    finishLoadings,
    finishLoading,

    // Управление ошибками
    setFieldError,
    clearFieldError,

    // Управление запросами
    registerRequest,
    completeRequest,
    failRequest,

    // Синхронизация
    toggleSync,
    addSyncField,
    removeSyncField,
    clearSyncFields,

    // Глобальные операции
    setIsDataLoaded,
    setPx,

    // Очистка
    clearField,
    clearAll,

    // Batch операции
    batchUpdateTiles,
} = chartsSlice.actions;

// ============= ДОПОЛНИТЕЛЬНЫЕ СЕЛЕКТОРЫ =============

/**
 * ✅ МЕМОИЗИРОВАННЫЙ: Получить все ID открытых вкладок
 */
export const selectAllTabIds = createSelector(
    [(state: RootState) => state.charts.byTab],
    (byTab): readonly Guid[] => {
        const ids = Object.keys(byTab) as Guid[];
        return Object.freeze(ids);
    }
);

/**
 * ✅ МЕМОИЗИРОВАННЫЙ: Получить информацию о вкладке
 */
export const selectTabInfo = createSelector(
    [
        (state: RootState, tabId: Guid) => state.charts.byTab[tabId]?.template,
    ],
    (template) => {
        if (!template) return undefined;

        return {
            template,
            fieldsCount: template.selectedFields.length,
        };
    }
);