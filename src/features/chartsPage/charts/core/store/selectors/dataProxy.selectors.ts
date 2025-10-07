// store/selectors/dataProxy.selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import {
    selectAvailableBuckets,
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange,
    selectFieldOriginalRange,
    selectFieldSeriesLevels,
    selectTilesByBucket
} from './base.selectors';
import { DataProxyService, type OptimalDataResult } from '@chartsPage/charts/orchestration/services/DataProxyService';
import type {BucketsMs, CoverageResult, FieldName} from "@chartsPage/charts/core/store/types/chart.types.ts";
import {TileSystemCore} from "@chartsPage/charts/core/store/tile-system/TileSystemCore.ts";

/**
 *     РЕФАКТОРИНГ: Используем TileSystemCore напрямую
 */
export const selectCurrentCoverage = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectFieldCurrentRange(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldOriginalRange(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentBucketMs(state, fieldName),
        (state: RootState, fieldName: FieldName) => {
            const bucketMs = selectFieldCurrentBucketMs(state, fieldName);
            if (!bucketMs) return [];
            return selectTilesByBucket(state, fieldName, bucketMs);
        }
    ],
    (currentRange, originalRange, bucketMs, tiles): CoverageResult => {
        if (!currentRange || !bucketMs || !originalRange) {
            return { coverage: 0, gaps: [], coveredRanges: [] };
        }

        //    Используем TileSystemCore напрямую
        const gapsResult = TileSystemCore.findGaps(
            originalRange,
            tiles,
            { fromMs: currentRange.from.getTime(), toMs: currentRange.to.getTime() }
        );

        return {
            coverage: gapsResult.coverage,
            gaps: gapsResult.gaps.map(g => ({ from: g.fromMs, to: g.toMs })),
            coveredRanges: []
        };
    }
);

/**
 *     РЕФАКТОРИНГ: Используем TileSystemCore
 */
export const selectBucketCoverageForRange = createSelector(
    [
        (_state: RootState, _fieldName: FieldName, _bucketMs: BucketsMs, fromMs: number) => fromMs,
        (_state: RootState, _fieldName: FieldName, _bucketMs: BucketsMs, _fromMs: number, toMs: number) => toMs,
        (state: RootState, fieldName: FieldName) => selectFieldOriginalRange(state, fieldName),
        (state: RootState, fieldName: FieldName, bucketMs: BucketsMs) =>
            selectTilesByBucket(state, fieldName, bucketMs)
    ],
    (fromMs, toMs, originalRange, tiles): CoverageResult => {
        if (!originalRange) {
            return { coverage: 0, gaps: [], coveredRanges: [] };
        }

        const gapsResult = TileSystemCore.findGaps(
            originalRange,
            tiles,
            { fromMs, toMs }
        );

        return {
            coverage: gapsResult.coverage,
            gaps: gapsResult.gaps.map(g => ({ from: g.fromMs, to: g.toMs })),
            coveredRanges: []
        };
    }
);

/**
 *     ИСПРАВЛЕНО: Передаем originalRange в DataProxyService
 */
export const selectOptimalData = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectFieldCurrentBucketMs(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentRange(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldOriginalRange(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldSeriesLevels(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectAvailableBuckets(state, fieldName)
    ],
    (currentBucketMs, currentRange, originalRange, seriesLevels, availableBuckets): OptimalDataResult => {
        if (!currentBucketMs || !seriesLevels || !currentRange || !originalRange) {
            return {
                data: [],
                quality: 'none',
                coverage: 0,
                sourceBucketMs: undefined,
                isStale: false,
                gaps: []
            };
        }

        //    Передаем originalRange в DataProxyService
        return DataProxyService.selectOptimalData({
            targetBucketMs: currentBucketMs,
            targetFromMs: currentRange.from.getTime(),
            targetToMs: currentRange.to.getTime(),
            originalRange,
            seriesLevels,
            availableBuckets
        });
    }
);