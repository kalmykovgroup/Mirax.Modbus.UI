// store/selectors/dataProxy.selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { FieldName, BucketsMs, CoverageResult } from '@charts/charts/core/types/chart.types';
import {
    selectAvailableBuckets,
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange,
    selectFieldSeriesLevels,
    selectTilesByBucket
} from './base.selectors';
import { DataProxyService, type OptimalDataResult } from '@charts/charts/orchestration/services/DataProxyService';

/**
 * Получить покрытие текущего диапазона текущим bucket
 * ✅ Используется RequestManager
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

        // Делегируем в DataProxyService
        return DataProxyService.calculateCoverage(
            tiles,
            currentRange.from.getTime(),
            currentRange.to.getTime()
        );
    }
);

/**
 * Получить coverage для конкретного bucket и диапазона
 * ✅ Используется RequestManager для prefetch
 */
export const selectBucketCoverageForRange = createSelector(
    [
        (_state: RootState, _fieldName: FieldName, _bucketMs: BucketsMs, fromMs: number) => fromMs,
        (_state: RootState, _fieldName: FieldName, _bucketMs: BucketsMs, _fromMs: number, toMs: number) => toMs,
        (state: RootState, fieldName: FieldName, bucketMs: BucketsMs) =>
            selectTilesByBucket(state, fieldName, bucketMs)
    ],
    (fromMs, toMs, tiles): CoverageResult => {
        // Делегируем в DataProxyService
        return DataProxyService.calculateCoverage(tiles, fromMs, toMs);
    }
);

/**
 * Получить оптимальные данные для отображения
 * ✅ Используется компонентами React
 */
export const selectOptimalData = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectFieldCurrentRange(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentBucketMs(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldSeriesLevels(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectAvailableBuckets(state, fieldName)
    ],
    (currentRange, currentBucketMs, seriesLevels, availableBuckets): OptimalDataResult => {
        if (!currentRange || !currentBucketMs || !seriesLevels) {
            return {
                data: [],
                quality: 'none',
                coverage: 0,
                sourceBucketMs: undefined,
                isStale: false,
                gaps: []
            };
        }

        // Делегируем в DataProxyService
        return DataProxyService.selectOptimalData({
            targetBucketMs: currentBucketMs,
            targetFromMs: currentRange.from.getTime(),
            targetToMs: currentRange.to.getTime(),
            seriesLevels,
            availableBuckets
        });
    }
);