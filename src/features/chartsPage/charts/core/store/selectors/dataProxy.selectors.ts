// store/selectors/dataProxy.selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { FieldName, BucketsMs, CoverageResult } from '@chartsPage/charts/core/store/types/loading.types';
import {
    selectAvailableBuckets,
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange,
    selectFieldSeriesLevels,
    selectTilesByBucket
} from './base.selectors';
import { DataProxyService, type OptimalDataResult } from '@chartsPage/charts/orchestration/services/DataProxyService';

/**
 * ✅ Покрытие текущего диапазона — используется только RequestManager
 */
export const selectCurrentCoverage = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectFieldCurrentRange(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentBucketMs(state, fieldName),
        (state: RootState, fieldName: FieldName) => {
            const bucketMs = selectFieldCurrentBucketMs(state, fieldName);
            if (!bucketMs) return [];
            return selectTilesByBucket(state, fieldName, bucketMs);
        }
    ],
    (currentRange, bucketMs, tiles): CoverageResult => {
        if (!currentRange || !bucketMs) {
            return { coverage: 0, gaps: [], coveredRanges: [] };
        }

        return DataProxyService.calculateCoverage(
            tiles,
            currentRange.from.getTime(),
            currentRange.to.getTime()
        );
    }
);

/**
 * ✅ Coverage для конкретного bucket — для prefetch
 */
export const selectBucketCoverageForRange = createSelector(
    [
        (_state: RootState, _fieldName: FieldName, _bucketMs: BucketsMs, fromMs: number) => fromMs,
        (_state: RootState, _fieldName: FieldName, _bucketMs: BucketsMs, _fromMs: number, toMs: number) => toMs,
        (state: RootState, fieldName: FieldName, bucketMs: BucketsMs) =>
            selectTilesByBucket(state, fieldName, bucketMs)
    ],
    (fromMs, toMs, tiles): CoverageResult => {
        return DataProxyService.calculateCoverage(tiles, fromMs, toMs);
    }
);

/**
 * ✅ ИСПРАВЛЕНО: НЕ зависит от currentRange
 *
 * Возвращает ВСЕ bins из оптимального bucket-уровня.
 * Фильтрация по видимому диапазону — задача ECharts.
 */
export const selectOptimalData = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectFieldCurrentBucketMs(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldSeriesLevels(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectAvailableBuckets(state, fieldName)
    ],
    (currentBucketMs, seriesLevels, availableBuckets): OptimalDataResult => {
        if (!currentBucketMs || !seriesLevels) {
            return {
                data: [],
                quality: 'none',
                coverage: 100, // Нет данных — 100% покрытие пустоты
                sourceBucketMs: undefined,
                isStale: false,
                gaps: []
            };
        }

        // ✅ Используем весь диапазон из tiles (без фильтрации)
        return DataProxyService.selectOptimalDataWithoutRange({
            targetBucketMs: currentBucketMs,
            seriesLevels,
            availableBuckets
        });
    }
);