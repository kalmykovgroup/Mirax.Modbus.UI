// src/features/chartsPage/charts/core/store/selectors/base.selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store.ts';
import type { LoadingState } from '@chartsPage/charts/core/store/types/loading.types';
import { LoadingType } from '@chartsPage/charts/core/store/types/loading.types';
import type { ResolvedCharReqTemplate } from '@chartsPage/template/shared/dtos/ResolvedCharReqTemplate.ts';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto.ts';
import type {
    BucketsMs,
    FieldName,
    FieldView,
    OriginalRange,
    SeriesTile,
    TimeRange,
} from '@chartsPage/charts/core/store/types/chart.types.ts';
import type { Guid } from '@app/lib/types/Guid';
import type { ContextState } from '@chartsPage/charts/core/store/chartsSlice';

// ============================================
// КОНСТАНТЫ ДЛЯ DEFAULT ЗНАЧЕНИЙ
// ============================================

const DEFAULT_LOADING_STATE: LoadingState = {
    active: false,
    type: LoadingType.Initial,
    progress: 0,
    startTime: 0,
} as const;

const EMPTY_TILES: readonly SeriesTile[] = [];
const EMPTY_BUCKETS: readonly BucketsMs[] = [];
const EMPTY_FIELDS: readonly FieldDto[] = [];

// ============================================
// БАЗОВЫЕ СЕЛЕКТОРЫ
// ============================================

export const selectContextState = (state: RootState, contextId: Guid): ContextState | undefined =>
    state.contexts.chartContexts[contextId];

export const selectChartContexts = (state: RootState): Record<Guid, ContextState> => state.contexts.chartContexts;

// ============================================
// ГЛОБАЛЬНЫЕ СЕЛЕКТОРЫ (для конкретного контекста)
// ============================================

export const selectTemplate = (
    state: RootState,
    contextId: Guid
): ResolvedCharReqTemplate | undefined => {
    const context = selectContextState(state, contextId);
    return context?.template;
};

 



// ============================================
// СЕЛЕКТОРЫ СИНХРОНИЗАЦИИ КОНТЕКСТА
// ============================================

/**
 * Получить все поля контекста, участвующие в синхронизации
 */
export const selectContextSyncFields = (
    state: RootState,
    contextId: Guid
): readonly FieldDto[] => {
    const context = selectContextState(state, contextId);
    return context?.syncFields ?? EMPTY_FIELDS;
};

/**
 * Проверить, участвует ли поле контекста в синхронизации
 */
export const selectIsContextFieldSynced = (
    state: RootState,
    contextId: Guid,
    fieldName: string
): boolean => {
    const syncFields = selectContextSyncFields(state, contextId);
    return syncFields.some((f) => f.name === fieldName);
};

 
export const selectAllViews = (state: RootState, contextId: Guid): Record<FieldName, FieldView> => {
    const context = selectContextState(state, contextId);
    return context?.view ?? {};
};

// ============================================
// FIELD VIEW СЕЛЕКТОРЫ
// ============================================

export const selectFieldView = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName
): FieldView | undefined => {
    const context = selectContextState(state, contextId);
    return context?.view[fieldName];
};

export const selectFieldOriginalRange = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName
): OriginalRange | undefined => {
    const view = selectFieldView(state, contextId, fieldName);
    return view?.originalRange;
};

export const selectFieldCurrentRange = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName
): TimeRange | undefined => {
    const view = selectFieldView(state, contextId, fieldName);
    return view?.currentRange;
};

export const selectFieldCurrentBucketMs = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName
): BucketsMs | undefined => {
    const view = selectFieldView(state, contextId, fieldName);
    return view?.currentBucketsMs;
};

 
export const selectFieldSeriesLevels = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName
): Record<BucketsMs, SeriesTile[]> | undefined => {
    const view = selectFieldView(state, contextId, fieldName);
    return view?.seriesLevel;
};

export const selectFieldLoadingState = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName
): LoadingState => {
    const view = selectFieldView(state, contextId, fieldName);
    return view?.loadingState ?? DEFAULT_LOADING_STATE;
};

 
// ============================================
// TILES СЕЛЕКТОРЫ
// ============================================

export const selectTilesByBucket = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName,
    bucketMs: BucketsMs
): readonly SeriesTile[] => {
    const seriesLevels = selectFieldSeriesLevels(state, contextId, fieldName);
    if (!seriesLevels) return EMPTY_TILES;

    const tiles = seriesLevels[bucketMs];
    return tiles ?? EMPTY_TILES;
};

/**
 * Мемоизированный селектор доступных bucket-уровней
 */
export const selectAvailableBuckets = createSelector(
    [
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldSeriesLevels(state, contextId, fieldName),
    ],
    (seriesLevels): readonly BucketsMs[] => {
        if (!seriesLevels) return EMPTY_BUCKETS;

        return Object.keys(seriesLevels)
            .map(Number)
            .filter((n) => !isNaN(n));
    }
);

// ============================================
// МЕМОИЗИРОВАННЫЕ СЕЛЕКТОРЫ
// ============================================

/**
 *  МЕМОИЗИРОВАННЫЙ: Получить все поля в контексте
 */
export const selectContextFields = createSelector(
    [(state: RootState, contextId: Guid) => selectTemplate(state, contextId)],
    (template): readonly FieldDto[] => {
        return template?.selectedFields ?? EMPTY_FIELDS;
    }
);
 
 

/**
 *  МЕМОИЗИРОВАННЫЙ: Получить все загружающиеся поля
 */
export const selectLoadingFields = createSelector(
    [(state: RootState, contextId: Guid) => selectAllViews(state, contextId)],
    (views): readonly FieldName[] => {
        const loadingFields = Object.entries(views)
            .filter(([_, view]) => view.loadingState.active)
            .map(([fieldName]) => fieldName);

        return Object.freeze(loadingFields);
    }
);

 