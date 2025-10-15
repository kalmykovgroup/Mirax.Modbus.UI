// src/features/chartsPage/charts/core/store/chartsSlice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
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

// ============= ТИПЫ =============

/**
 * Состояние графиков для одного контекста (прежнее TabChartsState)
 */
export interface ContextState {
    contextId: Guid;
    syncFields: FieldDto[];
    template: ResolvedCharReqTemplate | undefined;
    view: Record<FieldName, FieldView>;
    isDataLoaded: boolean;
}

/**
 * Глобальное состояние с поддержкой множественных контекстов
 */
export interface ContextsState {
    readonly chartContexts: Record<Guid, ContextState>;
}

// ============= НАЧАЛЬНОЕ СОСТОЯНИЕ =============

const initialContextState: Omit<ContextState, 'contextId'> = {
    syncFields: [],
    template: undefined,
    view: {},
    isDataLoaded: false,
};

const initialState: ContextsState = {
    chartContexts: {},
};

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

/**
 * Безопасное получение состояния контекста с автоинициализацией
 */
function getOrCreateContext(state: ContextsState, contextId: Guid): ContextState {
    if (!(contextId in state.chartContexts)) {
        state.chartContexts[contextId] = {
            contextId,
            syncFields: [],
            template: undefined,
            view: {},
            isDataLoaded: false,
        };
    }
    return state.chartContexts[contextId]!;
}



// ============= SLICE =============

const contextsSlice = createSlice({
    name: 'contexts',
    initialState,
    reducers: {
        // ========== УПРАВЛЕНИЕ КОНТЕКСТАМИ ==========

        /**
         * Создать или обновить контекст
         */
        createContext(
            state,
            action: PayloadAction<{
                readonly contextId: Guid;
                readonly template: ResolvedCharReqTemplate;
            }>
        ) {
            const { contextId, template } = action.payload;

            //  КРИТИЧНО: Проверяем, существует ли контекст
            if (state.chartContexts[contextId] !== undefined) {
                console.warn('[createContext] Context already exists, skipping:', contextId);
                return; // НЕ создаём повторно!
            }

            // Создаём новый контекст
            state.chartContexts[contextId] = {
                contextId: contextId,
                template: template,
                view: {},
                syncFields: [],
                isDataLoaded: false,
            };
        },

        /**
         * Удалить контекст полностью
         */
        deleteContext(state, action: PayloadAction<Guid>) {
            const contextId = action.payload;
            delete state.chartContexts[contextId];
            console.log('[deleteContext] Deleted:', contextId);
        },

        /**
         * Очистить состояние контекста без удаления
         */
        clearContext(state, action: PayloadAction<Guid>) {
            const contextId = action.payload;

            if (state.chartContexts[contextId] === undefined) {
                console.error('[clearContext] Context not found:', contextId);
                return;
            }

            state.chartContexts[contextId] = {
                contextId,
                ...initialContextState,
            };
        },


        // ========== УПРАВЛЕНИЕ ТАЙЛАМИ ==========

        iniTopTile(
            state,
            action: PayloadAction<{
                contextId: Guid;
                field: FieldName;
                bucketMs: BucketsMs;
                tile: SeriesTile;
            }>
        ) {
            const { contextId, field, bucketMs, tile } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) {
                console.error('[IniTopTile] Context not found:', contextId);
                return;
            }

            const view = context.view[field];
            if (!view) {
                console.error('[IniTopTile] View not found for field:', field);
                return;
            }

            view.seriesLevel[bucketMs]?.push(tile);
        },

        // ========== УПРАВЛЕНИЕ ШАБЛОНОМ ==========

        updateResolvedCharReqTemplate(state, action: PayloadAction<{template: ResolvedCharReqTemplate, contextId : Guid}>) {
            const { contextId, template } = action.payload;

            if(state.chartContexts[contextId]) {
                state.chartContexts[contextId].template = template;
                console.log('[updateResolvedCharReqTemplate] Updated:', contextId, template);
            }
            else{
                console.error("Контекст не найден", contextId);
            }
        },

        // ========== УПРАВЛЕНИЕ VIEW ==========

        initialDataView(
            state,
            action: PayloadAction<{
                contextId: Guid;
                field: FieldName;
                px: number;
                currentRange: TimeRange;
                originalRange: OriginalRange;
                currentBucketsMs: BucketsMs;
                seriesLevels: readonly BucketsMs[];
                error?: string | undefined;
            }>
        ) {
            const {
                contextId,
                field,
                px,
                currentRange,
                originalRange,
                currentBucketsMs,
                seriesLevels,
                error,
            } = action.payload;

            if (contextId === undefined) {
                console.error('[initialDataView] contextId is undefined');
                return;
            }

            const context = state.chartContexts[contextId];
            if (!context) {
                console.error('[initialDataView] Context not found:', contextId);
                return;
            }

            // Создаём пустой Record для серий
            const seriesLevel: Record<BucketsMs, SeriesTile[]> = {};

            // Инициализируем каждый level пустым массивом
            for (const bucket of seriesLevels) {
                seriesLevel[bucket] = [];
            }

            // Создаём новый view
            context.view[field] = {
                originalRange,
                currentRange,
                currentBucketsMs,
                seriesLevel,
                px,
                loadingState: {
                    active: false,
                    type: LoadingType.Initial,
                    progress: 0,
                    startTime: 0
                },
                error,
            };

            console.log('[initialDataView] Инициализация данных для view прошла успешно', field, contextId);
        },

        initialViews(
            state,
            action: PayloadAction<{
                contextId: Guid;
                px: number;
                fields: readonly FieldDto[];
            }>
        ) {
            const { contextId, px, fields } = action.payload;

            if (contextId === undefined) {
                console.error('[initialViews] contextId is undefined');
                return;
            }

            const context = state.chartContexts[contextId];
            if (!context) {
                console.error('[initialViews] Context not found:', contextId);
                return;
            }

            fields.forEach((field) => {
                if (!(field.name in context.view)) {
                    context.view[field.name] = {
                        originalRange: { fromMs: 0, toMs: 0 },
                        currentRange: { fromMs: 0, toMs: 0 },
                        currentBucketsMs: 0,
                        seriesLevel: {},
                        px,
                        loadingState: {
                            active: false,
                            type: LoadingType.Initial,
                            progress: 0,
                            startTime: 0,
                        },
                        error: undefined,
                    };
                }
            });
        },

        updateView(
            state,
            action: PayloadAction<{
                contextId: Guid;  // ← БЫЛО: tabId
                field: FieldName;
                px: number;  // ← ПРАВИЛЬНО: px, а не bins!
            }>
        ) {
            const { contextId, field, px } = action.payload;

            const context = state.chartContexts[contextId];  // ← БЫЛО: state.byTab[tabId]
            if (!context) return;

            const view = context.view[field];
            if (view) {
                view.px = px;
            }
        },

        setViewRange(
            state,
            action: PayloadAction<{
                contextId: Guid;
                field: FieldName;
                range: TimeRange;
            }>
        ) {
            const { contextId, field, range } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[field];
            if (view) {
                view.currentRange = range;
            }
        },

        setViewBucket(
            state,
            action: PayloadAction<{
                contextId: Guid;
                field: FieldName;
                bucketMs: BucketsMs;
            }>
        ) {
            const { contextId, field, bucketMs } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[field];
            if (view) {
                view.currentBucketsMs = bucketMs;
            }
        },

        // ========== УПРАВЛЕНИЕ ЗАГРУЗКОЙ ==========

        setLoadingState(
            state,
            action: PayloadAction<{
                contextId: Guid;
                field: FieldName;
                loadingState: LoadingState;
            }>
        ) {
            const { contextId, field, loadingState } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[field];
            if (view) {
                view.loadingState = loadingState;
            }
        },

        startLoading(
            state,
            action: PayloadAction<{
                contextId: Guid;
                field: FieldName;
                type: LoadingType;
                message?: string | undefined;
            }>
        ) {
            const { contextId, field, type, message } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[field];
            if (view) {
                view.loadingState = {
                    active: true,
                    type,
                    progress: 0,
                    startTime: Date.now(),
                    message
                };
            }
        },

        startLoadingFields(
            state,
            action: PayloadAction<{
                contextId: Guid;
                fields: readonly FieldDto[];
                type: LoadingType;
                messageError: string;
            }>
        ) {
            const { contextId, fields, type, messageError } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) {
                console.error('[startLoadingFields] Context not found:', contextId);
                return;
            }

            fields.forEach((field) => {
                const view = context.view[field.name];
                if (!view) {
                    console.warn('[startLoadingFields] View not found for field:', field.name);
                    return;
                }
                view.loadingState = {
                    active: true,
                    type,
                    progress: 0,
                    startTime: Date.now(),
                    message: messageError,
                } as LoadingState;
            });
        },

        updateLoadingProgress(
            state,
            action: PayloadAction<{
                contextId: Guid;
                field: FieldName;
                progress: number;
                message?: string | undefined;
            }>
        ) {
            const { contextId, field, progress, message } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[field];
            if (view && view.loadingState.active) {
                view.loadingState = {
                    ...view.loadingState,
                    progress: Math.min(progress, 100),
                    message: message
                };
            }
        },

        finishLoadings(
            state,
            action: PayloadAction<{
                contextId: Guid;
                fields: readonly FieldDto[];
                success: boolean
            }>
        ) {
            const { contextId, fields, success } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            fields.forEach((field) => {
                const view = context.view[field.name];
                if (view) {
                    view.loadingState = {
                        active: false,
                        type: LoadingType.Initial,
                        progress: 100,
                        startTime: 0,
                        success: success
                    } as LoadingState;
                }
            });
        },

        finishLoading(
            state,
            action: PayloadAction<{
                contextId: Guid;
                field: FieldName;
                success: boolean,
                message?: string | undefined;
            }>
        ) {
            const { contextId, field, message, success } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[field];
            if (view) {
                view.loadingState = {
                    active: false,
                    type: LoadingType.Initial,
                    progress: message ? 100 : 0,
                    startTime: 0,
                    message: message,
                    success: success
                } as LoadingState;
            }
        },

        // ========== УПРАВЛЕНИЕ ОШИБКАМИ ==========

        setFieldError(
            state,
            action: PayloadAction<{
                contextId: Guid;
                fieldName: FieldName;
                errorMessage?: string | undefined;
            }>
        ) {
            const { contextId, fieldName, errorMessage } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[fieldName];
            if (view) {
                view.error = errorMessage;
            }
        },

        clearFieldError(
            state,
            action: PayloadAction<{
                contextId: Guid;
                fieldName: FieldName;
            }>
        ) {
            const { contextId, fieldName } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[fieldName];
            if (view) {
                view.error = undefined;
            }
        },

        // ========== УПРАВЛЕНИЕ ЗАПРОСАМИ ==========

        registerRequest(
            state,
            action: PayloadAction<{
                readonly contextId: Guid;
                readonly field: FieldName;
                readonly bucketMs: BucketsMs;
                readonly interval: CoverageInterval;
                readonly requestId: string;
            }>
        ) {
            const { contextId, field, bucketMs, interval, requestId } = action.payload;
            const context = getOrCreateContext(state, contextId);
            const view = context.view[field];

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
                readonly contextId: Guid;
                readonly field: FieldName;
                readonly bucketMs: BucketsMs;
                readonly requestId: string;
                readonly bins: SeriesBinDto[];
            }>
        ) {
            const { contextId, field, bucketMs, requestId, bins } = action.payload;
            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[field];
            if (!view) return;

            const tiles = view.seriesLevel[bucketMs];
            if (!tiles) return;

            const tile: SeriesTile | undefined = tiles.find((t) => t.requestId === requestId);

            if (tile != undefined) {
                tile.bins = bins;
                tile.status = 'loading';
                delete tile.requestId;
            }
        },

        failRequest(
            state,
            action: PayloadAction<{
                readonly contextId: Guid;
                readonly field: FieldName;
                readonly bucketMs: BucketsMs;
                readonly requestId: string;
                readonly error: string;
            }>
        ) {
            const { contextId, field, bucketMs, requestId, error } = action.payload;
            const context = state.chartContexts[contextId];
            if (!context) return;

            const view = context.view[field];
            if (!view) return;

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

        /**
         * Добавить поле в синхронизацию контекста
         */
        addContextSyncField(
            state,
            action: PayloadAction<{
                readonly contextId: Guid;
                readonly field: FieldDto;
            }>
        ) {
            const { contextId, field } = action.payload;
            const context = getOrCreateContext(state, contextId);

            const exists = context.syncFields.some((f) => f.name === field.name);
            if (!exists) {
                context.syncFields = [...context.syncFields, field];
                console.log('[addContextSyncField] Added:', { contextId, fieldName: field.name });
            } else {
                console.warn('[addContextSyncField] Field already exists:', {
                    contextId,
                    fieldName: field.name,
                });
            }
        },

        /**
         * Удалить поле из синхронизации контекста
         */
        removeContextSyncField(
            state,
            action: PayloadAction<{
                readonly contextId: Guid;
                readonly fieldName: string;
            }>
        ) {
            const { contextId, fieldName } = action.payload;
            const context = getOrCreateContext(state, contextId);

            context.syncFields = context.syncFields.filter((f) => f.name !== fieldName);
            console.log('[removeContextSyncField] Removed:', { contextId, fieldName });
        },

        /**
         * Очистить все поля синхронизации контекста
         */
        clearContextSyncFields(state, action: PayloadAction<Guid>) {
            const contextId = action.payload;
            const context = getOrCreateContext(state, contextId);

            context.syncFields = [];
            console.log('[clearContextSyncFields]', { contextId });
        },


        // ========== ГЛОБАЛЬНЫЕ ОПЕРАЦИИ ==========

        setIsDataLoaded(
            state,
            action: PayloadAction<{
                contextId: Guid;
                isLoaded: boolean;
            }>
        ) {
            const { contextId, isLoaded } = action.payload;

            const context = state.chartContexts[contextId];
            if (context) {
                context.isDataLoaded = isLoaded;
            }
        },

        setPx(
            state,
            action: PayloadAction<{
                contextId: Guid;
                px: number;
            }>
        ) {
            const { contextId, px } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) return;

            Object.values(context.view).forEach((view) => {
                view.px = px;
            });
        },

        // ========== ОЧИСТКА ==========

        clearField(
            state,
            action: PayloadAction<{
                contextId: Guid;
                fieldName: FieldName;
            }>
        ) {
            const { contextId, fieldName } = action.payload;

            const context = state.chartContexts[contextId];
            if (context) {
                delete context.view[fieldName];
            }
        },

        // clearAll остаётся — очищает ВСЕ контексты
        clearAll(state) {
            state.chartContexts = {};
        },

        // ========== BATCH ОПЕРАЦИИ ==========

        batchUpdateTiles(
            state,
            action: PayloadAction<{
                contextId: Guid;
                updates: Array<{
                    field: FieldName;
                    bucketMs: BucketsMs;
                    tiles: SeriesTile[];
                }>;
            }>
        ) {
            const { contextId, updates } = action.payload;

            const context = state.chartContexts[contextId];
            if (!context) {
                console.error('[batchUpdateTiles] Context not found:', contextId);
                return;
            }

            updates.forEach((update) => {
                const view = context.view[update.field];

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

export const contextsReducer = contextsSlice.reducer;

export const {
    // Управление контекстами
    createContext,
    deleteContext,
    clearContext,

    // Управление тайлами
    iniTopTile,

    //шаблоны
    updateResolvedCharReqTemplate,

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

    // Синхронизация полей контекста
    addContextSyncField,
    removeContextSyncField,
    clearContextSyncFields,


    // Глобальные операции
    setIsDataLoaded,
    setPx,

    // Очистка
    clearField,
    clearAll,

    // Batch операции
    batchUpdateTiles,
} = contextsSlice.actions;

 