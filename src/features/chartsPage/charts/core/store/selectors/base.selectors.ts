// store/selectors/base.selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { LoadingState } from '@chartsPage/charts/core/store/types/loading.types';
import { LoadingType } from '@chartsPage/charts/core/store/types/loading.types';
import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared//dtos/ResolvedCharReqTemplate.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import type {
    BucketsMs,
    FieldName,
    FieldView, OriginalRange,
    SeriesTile,
    TimeRange
} from "@chartsPage/charts/core/store/types/chart.types.ts";

// ============================================
// КОНСТАНТЫ ДЛЯ DEFAULT ЗНАЧЕНИЙ
// ============================================

const DEFAULT_LOADING_STATE: LoadingState = {
    active: false,
    type: LoadingType.Initial,
    progress: 0,
    startTime: 0
} as const;

const EMPTY_TILES: readonly SeriesTile[] = [];
const EMPTY_BUCKETS: readonly BucketsMs[] = [];

// ============================================
// ГЛОБАЛЬНЫЕ СЕЛЕКТОРЫ
// ============================================

export const selectTemplate = (state: RootState): ResolvedCharReqTemplate | undefined =>
    state.charts.template;

export const selectIsDataLoaded = (state: RootState): boolean =>
    state.charts.isDataLoaded;



export const selectSyncEnabled = (state: RootState): boolean =>
    state.charts.syncEnabled;

export const selectSyncFields = (state: RootState): readonly FieldDto[] =>
    state.charts.syncFields;

export const selectAllViews = (state: RootState): Record<FieldName, FieldView> =>
    state.charts.view;

// ============================================
// FIELD VIEW СЕЛЕКТОРЫ
// ============================================

export const selectFieldView = (
    state: RootState,
    fieldName: FieldName
): FieldView | undefined =>
    state.charts.view[fieldName];

 
export const selectFieldOriginalRange = (
    state: RootState,
    fieldName: FieldName
): OriginalRange | undefined =>
    state.charts.view[fieldName]?.originalRange;

export const selectFieldCurrentRange = (
    state: RootState,
    fieldName: FieldName
): TimeRange | undefined =>
    state.charts.view[fieldName]?.currentRange;

export const selectFieldCurrentBucketMs = (
    state: RootState,
    fieldName: FieldName
): BucketsMs | undefined => {
    const view = state.charts.view[fieldName];
    return view?.currentBucketsMs;
};

export const selectFieldPx = (
    state: RootState,
    fieldName: FieldName
): number | undefined => {
    const view = state.charts.view[fieldName];
    return view?.px;
};

export const selectFieldSeriesLevels = (
    state: RootState,
    fieldName: FieldName
): Record<BucketsMs, SeriesTile[]> | undefined => {
    const view = state.charts.view[fieldName];
    return view?.seriesLevel;
};

export const selectFieldLoadingState = (
    state: RootState,
    fieldName: FieldName
): LoadingState => {
    const view = state.charts.view[fieldName];
    return view?.loadingState ?? DEFAULT_LOADING_STATE;
};

export const selectFieldError = (
    state: RootState,
    fieldName: FieldName
): string | undefined => {
    const view = state.charts.view[fieldName];
    return view?.error;
};

// ============================================
// TILES СЕЛЕКТОРЫ
// ============================================

export const selectTilesByBucket = (
    state: RootState,
    fieldName: FieldName,
    bucketMs: BucketsMs
): readonly SeriesTile[] => {
    const view = state.charts.view[fieldName];
    if (!view) return EMPTY_TILES;

    const tiles = view.seriesLevel[bucketMs];
    return tiles ?? EMPTY_TILES;
};

/**
 *  ИСПРАВЛЕНО: Убрана избыточная сортировка
 *
 * Мемоизированный селектор доступных bucket-уровней.
 * Object.keys() возвращает строки в порядке вставки (insertion order),
 * а мы вставляем buckets в порядке убывания (от крупного к мелкому) в buildBucketLevels.
 * Поэтому сортировка не нужна.
 *
 * ВАЖНО: Если порядок вставки в seriesLevel нарушен, нужно сортировать здесь.
 * Но по текущей логике (replaceTiles вызывается в цикле по bucketLevels),
 * порядок сохраняется.
 */
export const selectAvailableBuckets = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectFieldSeriesLevels(state, fieldName)
    ],
    (seriesLevels): readonly BucketsMs[] => {
        if (!seriesLevels) return EMPTY_BUCKETS;

        // Object.keys сохраняет insertion order для числовых ключей
        return Object.keys(seriesLevels)
            .map(Number)
            .filter(n => !isNaN(n));

        // Проверка: если нужна гарантия порядка, можно добавить условную сортировку
        // Но по дефолту insertion order = порядок из buildBucketLevels (от крупного к мелкому)

    }
);