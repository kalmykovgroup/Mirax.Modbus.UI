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
import type {Guid} from "@app/lib/types/Guid.ts";

/**
 *     РЕФАКТОРИНГ: Используем TileSystemCore напрямую
 */
export const selectCurrentCoverage = createSelector(
    [
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectFieldCurrentRange(state, tabId, fieldName),
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectFieldOriginalRange(state, tabId, fieldName),
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectFieldCurrentBucketMs(state, tabId, fieldName),
        (state: RootState, tabId: Guid, fieldName: FieldName) => {
            const bucketMs = selectFieldCurrentBucketMs(state, tabId, fieldName);
            if (!bucketMs) return [];
            return selectTilesByBucket(state, tabId, fieldName, bucketMs);
        },
    ],
    (currentRange, originalRange, bucketMs, tiles): CoverageResult => {
        if (!currentRange || !bucketMs || !originalRange) {
            return { coverage: 0, gaps: [], coveredRanges: [] };
        }

        const gapsResult = TileSystemCore.findGaps(originalRange, tiles, {
            fromMs: currentRange.fromMs,
            toMs: currentRange.toMs,
        });

        return {
            coverage: gapsResult.coverage,
            gaps: gapsResult.gaps.map((g) => ({ fromMs: g.fromMs, toMs: g.toMs })),
            coveredRanges: [],
        };
    }
);

/**
 *     РЕФАКТОРИНГ: Используем TileSystemCore
 */
export const selectBucketCoverageForRange = createSelector(
    [
        (
            _state: RootState,
            _tabId: Guid,
            _fieldName: FieldName,
            _bucketMs: BucketsMs,
            fromMs: number
        ) => fromMs,
        (
            _state: RootState,
            _tabId: Guid,
            _fieldName: FieldName,
            _bucketMs: BucketsMs,
            _fromMs: number,
            toMs: number
        ) => toMs,
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectFieldOriginalRange(state, tabId, fieldName),
        (state: RootState, tabId: Guid, fieldName: FieldName, bucketMs: BucketsMs) =>
            selectTilesByBucket(state, tabId, fieldName, bucketMs),
    ],
    (fromMs, toMs, originalRange, tiles): CoverageResult => {
        if (!originalRange) {
            return { coverage: 0, gaps: [], coveredRanges: [] };
        }

        const gapsResult = TileSystemCore.findGaps(originalRange, tiles, { fromMs, toMs });

        return {
            coverage: gapsResult.coverage,
            gaps: gapsResult.gaps.map((g) => ({ fromMs: g.fromMs, toMs: g.toMs })),
            coveredRanges: [],
        };
    }
);


/**
 *     ИСПРАВЛЕНО: Передаем originalRange в DataProxyService
 */
export const selectOptimalData = createSelector(
    [
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectFieldCurrentBucketMs(state, tabId, fieldName),
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectFieldCurrentRange(state, tabId, fieldName),
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectFieldOriginalRange(state, tabId, fieldName),
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectFieldSeriesLevels(state, tabId, fieldName),
        (state: RootState, tabId: Guid, fieldName: FieldName) =>
            selectAvailableBuckets(state, tabId, fieldName),
    ],
    (
        currentBucketMs,
        currentRange,
        originalRange,
        seriesLevels,
        availableBuckets
    ): OptimalDataResult => {
        if (!currentBucketMs || !seriesLevels || !currentRange || !originalRange) {
            return {
                data: [],
                quality: 'none',
                coverage: 0,
                sourceBucketMs: undefined,
                isStale: false,
                gaps: [],
            };
        }

        return DataProxyService.selectOptimalData({
            targetBucketMs: currentBucketMs,
            targetFromMs: currentRange.fromMs,
            targetToMs: currentRange.toMs,
            originalRange,
            seriesLevels,
            availableBuckets,
        });
    }
);