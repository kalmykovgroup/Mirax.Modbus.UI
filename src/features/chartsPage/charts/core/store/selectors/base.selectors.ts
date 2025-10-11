// src/features/chartsPage/charts/core/store/selectors/base.selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
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
    state.contexts.byContext[contextId];

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

export const selectIsDataLoaded = (state: RootState, contextId: Guid): boolean => {
    const context = selectContextState(state, contextId);
    return context?.isDataLoaded ?? false;
};

export const selectSyncEnabled = (state: RootState, contextId: Guid): boolean => {
    const context = selectContextState(state, contextId);
    return context?.syncEnabled ?? false;
};

export const selectSyncFields = (state: RootState, contextId: Guid): readonly FieldDto[] => {
    const context = selectContextState(state, contextId);
    return context?.syncFields ?? EMPTY_FIELDS;
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

export const selectFieldPx = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName
): number | undefined => {
    const view = selectFieldView(state, contextId, fieldName);
    return view?.px;
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

export const selectFieldError = (
    state: RootState,
    contextId: Guid,
    fieldName: FieldName
): string | undefined => {
    const view = selectFieldView(state, contextId, fieldName);
    return view?.error;
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
 * ✅ МЕМОИЗИРОВАННЫЙ: Получить все поля в контексте
 */
export const selectContextFields = createSelector(
    [(state: RootState, contextId: Guid) => selectTemplate(state, contextId)],
    (template): readonly FieldDto[] => {
        return template?.selectedFields ?? EMPTY_FIELDS;
    }
);

/**
 * ✅ МЕМОИЗИРОВАННЫЙ: Получить количество полей
 */
export const selectContextFieldsCount = createSelector(
    [selectContextFields],
    (fields): number => fields.length
);

/**
 * ✅ МЕМОИЗИРОВАННЫЙ: Проверка, есть ли данные для поля
 */
export const selectHasFieldData = createSelector(
    [
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldView(state, contextId, fieldName),
    ],
    (view): boolean => {
        if (!view) return false;

        // Проверяем наличие тайлов в любом bucket
        return Object.values(view.seriesLevel).some((tiles) => tiles.length > 0);
    }
);

/**
 * ✅ МЕМОИЗИРОВАННЫЙ: Получить все загружающиеся поля
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

/**
 * ✅ МЕМОИЗИРОВАННЫЙ: Проверка, идёт ли загрузка в контексте
 */
export const selectIsContextLoading = createSelector(
    [selectLoadingFields],
    (loadingFields): boolean => loadingFields.length > 0
);

/**
 * ✅ МЕМОИЗИРОВАННЫЙ: Получить поля с ошибками
 */
export const selectFieldsWithErrors = createSelector(
    [(state: RootState, contextId: Guid) => selectAllViews(state, contextId)],
    (views): readonly FieldName[] => {
        const errorFields = Object.entries(views)
            .filter(([_, view]) => view.error !== undefined)
            .map(([fieldName]) => fieldName);

        return Object.freeze(errorFields);
    }
);