// src/store/chartsSlice.ts

import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type LoadingState, LoadingType} from '@charts/charts/core/types/loading.types';
import type {
    BucketsMs,
    CoverageInterval,
    FieldName,
    FieldView,
    SeriesTile, TimeRange
} from "@charts/charts/core/types/chart.types.ts";
import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";
import type {ResolvedCharReqTemplate} from "@charts/template/shared/dtos/ResolvedCharReqTemplate.ts";
import type {SeriesBinDto} from "@charts/charts/shared/dtos/SeriesBinDto.ts";



export interface ChartsState {
    syncEnabled: boolean;
    syncFields: ReadonlyArray<FieldDto>;
    template?: ResolvedCharReqTemplate | undefined;
    view: Record<FieldName, FieldView>;
    isDataLoaded: boolean;
}

// ============= НАЧАЛЬНОЕ СОСТОЯНИЕ =============
const initialState: ChartsState = {
    syncEnabled: false,
    syncFields: [],
    template: undefined,
    view: {},
    isDataLoaded: false,
};

// ============= SLICE =============
const chartsSlice = createSlice({
    name: 'charts',
    initialState,
    reducers: {
        // ========== ИНИЦИАЛИЗАЦИЯ ==========

        setResolvedCharReqTemplate(
            state,
            action: PayloadAction<{ template: ResolvedCharReqTemplate }>
        ) {
            // @ts-ignore
            state.template = action.payload.template;
        },

        // ========== УПРАВЛЕНИЕ ТАЙЛАМИ ==========

        replaceTiles(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                tiles: SeriesTile[];
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            view.seriesLevel[action.payload.bucketMs] = action.payload.tiles;
        },

        addTile(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                tile: SeriesTile;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            if (!view.seriesLevel[action.payload.bucketMs]) {
                view.seriesLevel[action.payload.bucketMs] = [];
            }

            view.seriesLevel[action.payload.bucketMs]!.push(action.payload.tile)
        },

        updateTileStatus(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                interval: CoverageInterval;
                status: 'loading' | 'ready' | 'error';
                error?: string | undefined;
            }>
        ) {
            const view = state.view[action.payload.field];

            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            const tiles = view.seriesLevel[action.payload.bucketMs];
            if (!tiles) return;

            const tile = tiles.find(t =>
                t.coverageInterval.fromMs === action.payload.interval.fromMs &&
                t.coverageInterval.toMs === action.payload.interval.toMs
            );

            if (tile) {
                tile.status = action.payload.status;
                tile.error = action.payload.error;
            }
        },

        setTileError(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                interval: CoverageInterval;
                error: string;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            const tiles = view.seriesLevel[action.payload.bucketMs];
            if (!tiles) return;

            const tile = tiles.find(t =>
                t.coverageInterval.fromMs === action.payload.interval.fromMs &&
                t.coverageInterval.toMs === action.payload.interval.toMs
            );

            if (tile) {
                tile.status = 'error';
                tile.error = action.payload.error;
            }
        },

        // ========== УПРАВЛЕНИЕ VIEW ==========

        initialDataView(
            state,
            action: PayloadAction<{
                field: FieldName;
                px: number;
                currentRange: TimeRange;
                currentBucketsMs: BucketsMs;
                seriesLevels: readonly BucketsMs[];
                error?: string | undefined;
            }>
        ){
            const { field, px, currentRange, currentBucketsMs, seriesLevels, error } = action.payload;

            let view = state.view[field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            view.px = px;
            view.currentRange = currentRange;
            view.currentBucketsMs = currentBucketsMs;
            view.error = error;

            seriesLevels.forEach(bucket => {
                if (!view.seriesLevel[bucket]) {
                    view.seriesLevel[bucket] = [];
                }
            });
        },

        initialViews(
            state,
            action: PayloadAction<{
                readonly fields: readonly FieldDto[];
                readonly px: number;
            }>
        ) {
            const { fields, px } = action.payload;

            fields.forEach(field => {

                if (!(field.name in state.view)) {
                    state.view[field.name] = {
                        px,
                        seriesLevel: {},
                        loadingState: {
                            active: false,
                            type: LoadingType.Initial,
                            progress: 0,
                            startTime: Date.now()
                        },
                        currentRange: undefined,
                        currentBucketsMs: undefined,
                        error: undefined
                    };
                    console.debug('[initialViews] Created view for:', field.name);
                } else {
                   console.error(`[replaceTiles] View not found for field: ${field.name}`);
                }
            });
        },

        updateView(
            state,
            action: PayloadAction<{
                field: FieldName;
                px?: number | undefined;
                currentRange?: TimeRange | undefined;
                currentBucketsMs?: BucketsMs | undefined;
                seriesLevels?: BucketsMs[] | undefined;
                error?: string | undefined;
            }>
        ) {
            const { field, px, currentRange, currentBucketsMs, seriesLevels, error } = action.payload;

            let view = state.view[field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            if (px !== undefined) view.px = px;
            if (currentRange !== undefined) view.currentRange = currentRange;
            if (currentBucketsMs !== undefined) view.currentBucketsMs = currentBucketsMs;
            if (error !== undefined) view.error = error;

            if (seriesLevels) {
                seriesLevels.forEach(bucket => {
                    if (!view.seriesLevel[bucket]) {
                        view.seriesLevel[bucket] = [];
                    }
                });
            }
        },

        setViewRange(
            state,
            action: PayloadAction<{
                field: FieldName;
                range: TimeRange;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }
            view.currentRange = action.payload.range;
        },

        setViewBucket(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            view.currentBucketsMs = action.payload.bucketMs;

        },

        // ========== УПРАВЛЕНИЕ ЗАГРУЗКОЙ ==========

        setLoadingState(
            state,
            action: PayloadAction<{
                field: FieldName;
                loadingState: Partial<LoadingState>;
            }>
        ) {
            const view = state.view[action.payload.field];

            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            view.loadingState = {
                ...view.loadingState,
                ...action.payload.loadingState
            };
        },

        startLoadingFields(
            state,
                           action: PayloadAction<{
                               fields: readonly FieldDto[];
                               type: LoadingType;
                               message?: string | undefined;
                           }>){
            const { fields, type, message } = action.payload;

            fields.forEach(field => {
                const view = state.view[field.name];

                if(!view) {
                    console.error(`[replaceTiles] View not found for field: ${field.name}`);
                    return;
                }

                view.loadingState = {
                    active: true,
                    type: type,
                    progress: 0,
                    message: message,
                    startTime: Date.now()
                };
                view.error = undefined;
            })
        },

        startLoading(
            state,
            action: PayloadAction<{
                field: FieldName;
                type: LoadingType;
                message?: string | undefined;
            }>
        ) {
            const view = state.view[action.payload.field];

            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            view.loadingState = {
                active: true,
                type: action.payload.type,
                progress: 0,
                message: action.payload.message,
                startTime: Date.now()
            };
            view.error = undefined;
        },

        updateLoadingProgress(
            state,
            action: PayloadAction<{
                field: FieldName;
                progress: number;
                message?: string | undefined;
                estimatedEndTime?: number | undefined;
                bytesLoaded?: number | undefined;
                totalBytes?: number | undefined;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (view && view.loadingState.active) {
                view.loadingState.progress = action.payload.progress;

                if (action.payload.message !== undefined) {
                    view.loadingState.message = action.payload.message;
                }
                if (action.payload.estimatedEndTime !== undefined) {
                    view.loadingState.estimatedEndTime = action.payload.estimatedEndTime;
                }
                if (action.payload.bytesLoaded !== undefined) {
                    view.loadingState.bytesLoaded = action.payload.bytesLoaded;
                }
                if (action.payload.totalBytes !== undefined) {
                    view.loadingState.totalBytes = action.payload.totalBytes;
                }
            }
        },
        finishLoadings(
            state,
            action: PayloadAction<{
                 fields: readonly FieldDto[];
                 success: boolean;
                 error?: string | undefined;
            }>
        ) {
            const { fields, success, error } = action.payload;

            fields.forEach(field => {
                const view = state.view[field.name];
                if (!view) {
                    console.error(`[replaceTiles] View not found for field: ${field.name}`);
                    return;
                }

                view.loadingState.active = false;
                view.loadingState.progress = success ? 100 : view.loadingState.progress;

                if (!success && error) {
                    view.error = error;
                }
            });
        },
        finishLoading(
            state,
            action: PayloadAction<{
                field: FieldName;
                success: boolean;
                error?: string | undefined;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            view.loadingState.active = false;
            view.loadingState.progress = action.payload.success ? 100 : view.loadingState.progress;

            if (!action.payload.success && action.payload.error) {
                view.error = action.payload.error;
            }

        },

        // ========== УПРАВЛЕНИЕ ОШИБКАМИ ==========

        setFieldError(
            state,
            action: PayloadAction<{
                fieldName: FieldName;
                error?: string | undefined;
            }>
        ) {
            const view = state.view[action.payload.fieldName];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.fieldName}`);
                return;
            }
             view.error = action.payload.error;

        },

        clearFieldError(state, action: PayloadAction<FieldName>) {
            const view = state.view[action.payload];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload}`);
                return;
            }
             view.error = undefined;

        },

        // ========== УПРАВЛЕНИЕ ЗАПРОСАМИ ==========

        registerRequest(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                interval: CoverageInterval;
                requestId: string;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view)  throw Error("view для поля " + action.payload.field + " не найден")

            if (!view.seriesLevel[action.payload.bucketMs]) {
                view.seriesLevel[action.payload.bucketMs] = [];
            }

            view.seriesLevel[action.payload.bucketMs]!.push({
                coverageInterval: action.payload.interval,
                bins: [],
                status: 'loading',
                requestId: action.payload.requestId
            });
        },

        completeRequest(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                requestId: string;
                bins: SeriesBinDto[];
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            const tiles = view.seriesLevel[action.payload.bucketMs];
            if (!tiles) return;

            const tile = tiles.find(t => t.requestId === action.payload.requestId);
            if (tile) {
                tile.bins = action.payload.bins;
                tile.status = 'ready';
                tile.loadedAt = Date.now();
                delete tile.requestId;
            }
        },

        failRequest(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                requestId: string;
                error: string;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (!view) {
                console.error(`[replaceTiles] View not found for field: ${action.payload.field}`);
                return;
            }

            const tiles = view.seriesLevel[action.payload.bucketMs];
            if (!tiles) return;

            const tile = tiles.find(t => t.requestId === action.payload.requestId);
            if (tile) {
                tile.status = 'error';
                tile.error = action.payload.error;
                delete tile.requestId;
            }
        },

        // ========== СИНХРОНИЗАЦИЯ ==========

        toggleSync(state) {
            state.syncEnabled = !state.syncEnabled;
        },

        addSyncField(state, action: PayloadAction<FieldDto>) {
            const exists = state.syncFields.some(f => f.name === action.payload.name);
            if (!exists) {
                state.syncFields = [...state.syncFields, action.payload];
            }
        },

        removeSyncField(state, action: PayloadAction<string>) {
            state.syncFields = state.syncFields.filter(f => f.name !== action.payload);
        },

        clearSyncFields(state) {
            state.syncFields = [];
        },

        // ========== ГЛОБАЛЬНЫЕ ОПЕРАЦИИ ==========

        setIsDataLoaded(state, action: PayloadAction<boolean>) {
            state.isDataLoaded = action.payload;
        },

        setPx(state, action: PayloadAction<number>) {
            Object.values(state.view).forEach(view => {
                 view.px = action.payload;
            });
        },

        // ========== ОЧИСТКА ==========

        clearField(state, action: PayloadAction<FieldName>) {
            delete state.view[action.payload];
        },

        clearAll(state) {
            console.debug("Сброс")
            state.template = undefined;
            state.view = {};
            state.syncFields = [];
            state.isDataLoaded = false;
        },

        // ========== BATCH ОПЕРАЦИИ ==========

        batchUpdateTiles(
            state,
            action: PayloadAction<Array<{
                field: FieldName;
                bucketMs: BucketsMs;
                tiles: SeriesTile[];
            }>>
        ) {
            action.payload.forEach(update => {
                const view = state.view[update.field];

                if (!view) {
                    console.error(`[replaceTiles] View not found for field: ${update.field}`);
                    return;
                }

                view.seriesLevel[update.bucketMs] = update.tiles;

            });
        }
    }
});

// ============= ЭКСПОРТЫ =============
export const chartsReducer = chartsSlice.reducer;

export const {
    // Инициализация
    setResolvedCharReqTemplate,

    // Управление тайлами
    replaceTiles,
    addTile,
    updateTileStatus,
    setTileError,

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
    batchUpdateTiles
} = chartsSlice.actions;