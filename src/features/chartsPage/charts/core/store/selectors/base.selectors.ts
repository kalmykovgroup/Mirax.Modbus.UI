// store/selectors/base.selectors.ts

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
import type { TabChartsState } from '@chartsPage/charts/core/store/chartsSlice';

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

// ============================================
// БАЗОВЫЕ СЕЛЕКТОРЫ
// ============================================

export const selectActiveTabId = (state: RootState): Guid | undefined => state.charts.activeTabId;

export const selectTabState = (state: RootState, tabId: Guid): TabChartsState | undefined =>
    state.charts.byTab[tabId];

// ============================================
// ГЛОБАЛЬНЫЕ СЕЛЕКТОРЫ (для конкретной вкладки)
// ============================================

export const selectTemplate = (
    state: RootState,
    tabId: Guid
): ResolvedCharReqTemplate | undefined => {
    const tab = selectTabState(state, tabId);
    return tab?.template;
};

export const selectIsDataLoaded = (state: RootState, tabId: Guid): boolean => {
    const tab = selectTabState(state, tabId);
    return tab?.isDataLoaded ?? false;
};

export const selectSyncEnabled = (state: RootState, tabId: Guid): boolean => {
    const tab = selectTabState(state, tabId);
    return tab?.syncEnabled ?? false;
};

export const selectSyncFields = (state: RootState, tabId: Guid): readonly FieldDto[] => {
    const tab = selectTabState(state, tabId);
    return tab?.syncFields ?? [];
};

export const selectAllViews = (state: RootState, tabId: Guid): Record<FieldName, FieldView> => {
    const tab = selectTabState(state, tabId);
    return tab?.view ?? {};
};

// ============================================
// FIELD VIEW СЕЛЕКТОРЫ
// ============================================

export const selectFieldView = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName
): FieldView | undefined => {
    const tab = selectTabState(state, tabId);
    return tab?.view[fieldName];
};

export const selectFieldOriginalRange = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName
): OriginalRange | undefined => {
    const view = selectFieldView(state, tabId, fieldName);
    return view?.originalRange;
};

export const selectFieldCurrentRange = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName
): TimeRange | undefined => {
    const view = selectFieldView(state, tabId, fieldName);
    return view?.currentRange;
};

export const selectFieldCurrentBucketMs = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName
): BucketsMs | undefined => {
    const view = selectFieldView(state, tabId, fieldName);
    return view?.currentBucketsMs;
};

export const selectFieldPx = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName
): number | undefined => {
    const view = selectFieldView(state, tabId, fieldName);
    return view?.px;
};

export const selectFieldSeriesLevels = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName
): Record<BucketsMs, SeriesTile[]> | undefined => {
    const view = selectFieldView(state, tabId, fieldName);
    return view?.seriesLevel;
};

export const selectFieldLoadingState = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName
): LoadingState => {
    const view = selectFieldView(state, tabId, fieldName);
    return view?.loadingState ?? DEFAULT_LOADING_STATE;
};

export const selectFieldError = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName
): string | undefined => {
    const view = selectFieldView(state, tabId, fieldName);
    return view?.error;
};

// ============================================
// TILES СЕЛЕКТОРЫ
// ============================================

export const selectTilesByBucket = (
    state: RootState,
    tabId: Guid,
    fieldName: FieldName,
    bucketMs: BucketsMs
): readonly SeriesTile[] => {
    const seriesLevels = selectFieldSeriesLevels(state, tabId, fieldName);
    if (!seriesLevels) return EMPTY_TILES;

    const tiles = seriesLevels[bucketMs];
    return tiles ?? EMPTY_TILES;
};

/**
 * Мемоизированный селектор доступных bucket-уровней
 */
export const selectAvailableBuckets = createSelector(
    [(state: RootState, tabId: Guid, fieldName: FieldName) => selectFieldSeriesLevels(state, tabId, fieldName)],
    (seriesLevels): readonly BucketsMs[] => {
        if (!seriesLevels) return EMPTY_BUCKETS;

        return Object.keys(seriesLevels)
            .map(Number)
            .filter((n) => !isNaN(n));
    }
);


/**
 * ✅ УДОБНЫЕ СЕЛЕКТОРЫ: Автоматически используют activeTabId
 */

export const selectActiveTemplate = (state: RootState): ResolvedCharReqTemplate | undefined => {
    const tabId = selectActiveTabId(state);
    return tabId ? selectTemplate(state, tabId) : undefined;
};

export const selectActiveTabState = (state: RootState): TabChartsState | undefined => {
    const tabId = selectActiveTabId(state);
    return tabId ? selectTabState(state, tabId) : undefined;
};

export const selectActiveSyncEnabled = (state: RootState): boolean => {
    const tabId = selectActiveTabId(state);
    return tabId ? selectSyncEnabled(state, tabId) : false;
};

export const selectActiveSyncFields = (state: RootState): readonly FieldDto[] => {
    const tabId = selectActiveTabId(state);
    return tabId ? selectSyncFields(state, tabId) : [];
};