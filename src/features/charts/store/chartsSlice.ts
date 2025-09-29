// src/store/chartsSlice.ts

import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {ResolvedCharReqTemplate} from '@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate';
import type {SeriesBinDto} from '@charts/shared/contracts/chart/Dtos/SeriesBinDto';
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import {type LoadingState, LoadingType} from '@charts/ui/CharContainer/types';

// Типы
export type FieldName = string;
export type BucketsMs = number;
export type TimeRange = { from: Date; to: Date };
export type TimeRangeBounds = { from: Date | undefined; to: Date | undefined };
export type CoverageInterval = { fromMs: number; toMs: number };

export interface SeriesTile {
    coverageInterval: CoverageInterval;
    bins: SeriesBinDto[];
    status: 'ready' | 'loading' | 'error';
    error?: string | undefined;
}

export interface FieldView {
    px?: number | undefined;
    currentRange?: TimeRange | undefined;
    currentBucketsMs?: BucketsMs | undefined;
    seriesLevel: Record<BucketsMs, SeriesTile[]>;
    loadingState: LoadingState;
    error?: string | undefined;
}

export type ChartsState = {
    syncEnabled: boolean;
    syncFields: ReadonlyArray<FieldDto>;
    template?: ResolvedCharReqTemplate | undefined;
    view: Record<FieldName, FieldView>;
    isDataLoaded: boolean;
};

// Начальное состояние
const initialState: ChartsState = {
    syncEnabled: false,
    syncFields: [],
    view: {},
    isDataLoaded: false,
};

// Вспомогательные функции
function mergeTiles(tiles: SeriesTile[]): SeriesTile[] {
    if (!tiles.length) return [];

    const sorted = [...tiles].sort(
        (a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs
    );

    const result: SeriesTile[] = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const canMerge =
            current.coverageInterval.toMs >= next.coverageInterval.fromMs &&
            current.status === next.status;

        if (canMerge) {
            current.coverageInterval.toMs = Math.max(
                current.coverageInterval.toMs,
                next.coverageInterval.toMs
            );
            const allBins = [...current.bins, ...next.bins];
            const uniqueBins = new Map<number, SeriesBinDto>();

            allBins.forEach(bin => {
                const time = new Date(bin.t).getTime();
                uniqueBins.set(time, bin);
            });

            current.bins = Array.from(uniqueBins.values())
                .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
        } else {
            result.push(current);
            current = { ...next };
        }
    }
    result.push(current);

    return result;
}

function createInitialFieldView(): FieldView {

    return {
        px: undefined,
        currentRange: undefined,
        currentBucketsMs: undefined,
        seriesLevel: {},
        loadingState: createInitialLoadingState(),
        error: undefined
    } as FieldView
}

// Функция для создания начального состояния загрузки
function createInitialLoadingState(): LoadingState {
    return {
        active: false,
        type: LoadingType.Initial,
        progress: 0,
        message: undefined,
        startTime: Date.now(),
    } as LoadingState;
}

// Slice
const chartsSlice = createSlice({
    name: 'charts',
    initialState,
    reducers: {
        setResolvedCharReqTemplate(
            state,
            action: PayloadAction<{template: ResolvedCharReqTemplate}>
        ) {
            const { template } = action.payload;

            // @ts-ignore
            state.template = template;

            template.selectedFields.forEach(field => {
                state.view[field.name] = createInitialFieldView();
            });
        },
        // chartsSlice.ts - улучшаем updateView
        updateView(
            state,
            action: PayloadAction<{
                field: FieldName;
                px?: number | undefined;
                currentRange?: TimeRange | undefined;
                currentBucketsMs?: BucketsMs | undefined;
                seriesLevels?: BucketsMs[] | undefined;
                error?: string | undefined
            }>
        ) {
            const { field, px, currentRange, currentBucketsMs, seriesLevels, error } = action.payload;

            let view = state.view[field];

            if (!view) {
                view = createInitialFieldView();
                state.view[field] = view;
            }

            // Атомарное обновление всех полей
            if (px !== undefined) view.px = px;
            if (currentRange !== undefined) view.currentRange = currentRange;
            if (currentBucketsMs !== undefined) view.currentBucketsMs = currentBucketsMs;
            if (error !== undefined) view.error = error;

            if (seriesLevels) {
                for (const bucket of seriesLevels) {
                    if (!view.seriesLevel[bucket]) {
                        view.seriesLevel[bucket] = [];
                    }
                }
            }
        },

        setFieldError(state, action: PayloadAction<{fieldName: FieldName, error?: string | undefined}>){
           const {fieldName, error} = action.payload;

            const view = state.view[fieldName]

            if(!view) throw Error("view not found");

            view.error = error;
        },


        setLoadingState(
            state,
            action: PayloadAction<{
                field: FieldName;
                loadingState: Partial<LoadingState>
            }>
        ) {
            const view = state.view[action.payload.field];
            if (view) {
                view.loadingState = {
                    ...view.loadingState,
                    ...action.payload.loadingState
                };
            }
        },

        startLoading(
            state,
            action: PayloadAction<{
                field: FieldName;
                type: LoadingType;
                message?: string;
            }>
        ) {
            const view = state.view[action.payload.field];
            if (view) {
                view.loadingState = {
                    active: true,
                    type: action.payload.type,
                    progress: 0,
                    message: action.payload.message,
                    startTime: Date.now()
                };
                view.error = undefined;
            }
        },

        updateLoadingProgress(
            state,
            action: PayloadAction<{
                field: FieldName;
                progress: number;
                message?: string;
                estimatedEndTime?: number;
                bytesLoaded?: number;
                totalBytes?: number;
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

        finishLoading(
            state,
            action: PayloadAction<{
                field: FieldName;
                success: boolean;
                error?: string | undefined;
            }>
        ) {
            const view = state.view[action.payload.field];

            if(!view) throw Error("view is not initialized");


            view.loadingState.active = false;
            view.loadingState.progress = action.payload.success ? 100 : view.loadingState.progress;

            if (!action.payload.success && action.payload.error) {
                view.error = action.payload.error;
            }

        },



        upsertTiles(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                tiles: SeriesTile[]
            }>
        ) {
            const { field, bucketMs, tiles } = action.payload;
            const view = state.view[field];
            if (!view) return;

            if (!view.seriesLevel[bucketMs]) {
                view.seriesLevel[bucketMs] = [];
            }

            const existingTiles = view.seriesLevel[bucketMs];
            const readyTiles = tiles.map(t => ({
                ...t,
                status: 'ready' as const
            }));

            view.seriesLevel[bucketMs] = mergeTiles([...existingTiles, ...readyTiles]);
        },



        clearField(state, action: PayloadAction<FieldName>) {
            delete state.view[action.payload];
        },

        clearAll(state) {
            state.template = undefined;
            state.view = {};
        },


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

        setIsDataLoaded(state, action: PayloadAction<boolean>) {
            state.isDataLoaded = action.payload;
        },
        setPx(state, action: PayloadAction<number>) {
            Object.values(state.view).forEach((view) => {
                if (view) {
                    view.px = action.payload;
                    console.log("setPx", view.px)
                }
            });
        },

    },
});

// Экспорты
export const chartsReducer = chartsSlice.reducer;

export const {
    setResolvedCharReqTemplate,
    updateView,
    setFieldError,
    finishLoading,
    upsertTiles,
    startLoading,
    setIsDataLoaded,
    setPx,
    setLoadingState,
    updateLoadingProgress,
    clearField,
    clearAll,
    toggleSync,
    addSyncField,
    removeSyncField,
    clearSyncFields,
} = chartsSlice.actions;