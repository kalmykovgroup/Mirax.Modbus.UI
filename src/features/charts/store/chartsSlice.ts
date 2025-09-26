// src/store/chartsSlice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ResolvedCharReqTemplate } from '@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto';
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";

// Типы
export type FieldName = string;
export type BucketsMs = number;
export type TimeRange = { from: Date; to: Date };
export type TimeRangeBounds  = { from: Date | undefined; to: Date | undefined };
export type CoverageInterval = { fromMs: number; toMs: number };

export interface SeriesTile {
    coverageInterval: CoverageInterval;
    bins: SeriesBinDto[];
    status: 'ready' | 'loading' | 'error';
    error?: string | undefined;
}

export interface FieldView {
    px: number;
    currentRange: TimeRange;
    loading: boolean;
    error?: string | undefined;
    currentBucketsMs: BucketsMs;
    seriesLevel: Record<BucketsMs, SeriesTile[]>;
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
    template: undefined,
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
            // Объединяем bins и сортируем
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

// Slice
const chartsSlice = createSlice({
    name: 'charts',
    initialState,
    reducers: {
        setResolvedCharReqTemplate(
            state,
            action: PayloadAction<ResolvedCharReqTemplate | undefined>
        ) {
            state.template = action.payload;
        },

        ensureView(
            state,
            action: PayloadAction<{
                field: FieldName;
                px: number;
                currentRange: TimeRange;
                currentBucketsMs: BucketsMs;
            }>
        ) {
            const { field, px, currentRange, currentBucketsMs } = action.payload;

            if (!state.view[field]) {
                state.view[field] = {
                    px,
                    loading: false,
                    error: undefined,
                    currentRange: currentRange,
                    currentBucketsMs,
                    seriesLevel: {},
                };
            } else {
                const view = state.view[field];
                view.px = px;
                if (currentRange) {
                    view.currentRange = currentRange;
                }
                view.currentBucketsMs = currentBucketsMs;
            }
        },

        ensureLevels(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketList: BucketsMs[]
            }>
        ) {
            const { field, bucketList } = action.payload;
            const view = state.view[field];
            if (!view) return;

            for (const bucket of bucketList) {
                if (!view.seriesLevel[bucket]) {
                    view.seriesLevel[bucket] = [];
                }
            }
        },

        setCurrentBucketMs(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs
            }>
        ) {
            const view = state.view[action.payload.field];
            if (view) {
                view.currentBucketsMs = action.payload.bucketMs;
            }
        },

        setFieldLoading(
            state,
            action: PayloadAction<{
                field: FieldName;
                loading: boolean
            }>
        ) {
            const view = state.view[action.payload.field];
            if (view) {
                view.loading = action.payload.loading;
                if (action.payload.loading) {
                    view.error = undefined;
                }
            }
        },

        setFieldError(
            state,
            action: PayloadAction<{
                field: FieldName;
                error?: string | undefined
            }>
        ) {
            const view = state.view[action.payload.field];
            if (view) {
                view.error = action.payload.error;
                view.loading = false;
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

            // Инициализируем уровень если его нет
            if (!view.seriesLevel[bucketMs]) {
                view.seriesLevel[bucketMs] = [];
            }

            // Добавляем новые тайлы
            const existingTiles = view.seriesLevel[bucketMs];
            const readyTiles = tiles.map(t => ({
                ...t,
                status: 'ready' as const
            }));

            // Простое добавление и слияние
            view.seriesLevel[bucketMs] = mergeTiles([...existingTiles, ...readyTiles]);
        },

        clearLevel(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs
            }>
        ) {
            const view = state.view[action.payload.field];
            if (view) {
                delete view.seriesLevel[action.payload.bucketMs];
            }
        },

        clearField(state, action: PayloadAction<FieldName>) {
            delete state.view[action.payload];
        },

        clearAll(state) {
            state.template = undefined;
            state.view = {};
        },
        updateCurrentRange(state, action: PayloadAction<{field: FieldName, range: TimeRange}>){

            const view = state.view[action.payload.field];
            if(view == undefined) throw Error("view was not undefined");
            view.currentRange = action.payload.range;
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
        removeSyncField(state, action: PayloadAction<string>) { // по id
            state.syncFields = state.syncFields.filter(f => f.name !== action.payload);
        },
        clearSyncFields(state) {
            state.syncFields = [];
        },
        setIsDataLoaded(state, action: PayloadAction<boolean>) {
            //Защита от повторного первого вызова.
            state.isDataLoaded = action.payload;
        }
    },
});

// Экспорты
export const chartsReducer = chartsSlice.reducer;

export const {
    setResolvedCharReqTemplate,
    ensureView,
    ensureLevels,
    setCurrentBucketMs,
    setFieldLoading,
    setFieldError,
    upsertTiles,
    clearLevel,
    clearField,
    clearAll,
    updateCurrentRange,
    toggleSync,
    addSyncField,
    removeSyncField,
    clearSyncFields,
    setIsDataLoaded
} = chartsSlice.actions;

