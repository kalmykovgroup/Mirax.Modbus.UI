// src/features/chartsPage/charts/core/store/selectors/dataProxy.selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store.ts';

import {
    DataProxyService,
    type OptimalDataResult,
} from '@chartsPage/charts/orchestration/services/DataProxyService';
import type {
    BucketsMs,
    CoverageResult,
    FieldName,
} from '@chartsPage/charts/core/store/types/chart.types.ts';
import { TileSystemCore } from '@chartsPage/charts/core/store/tile-system/TileSystemCore.ts';
import type { Guid } from '@app/lib/types/Guid.ts';
import {
    selectAvailableBuckets,
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange,
    selectFieldOriginalRange, selectFieldSeriesLevels, selectTilesByBucket
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";

/**
 * РЕФАКТОРИНГ: Используем TileSystemCore напрямую
 * Вычисляет покрытие для текущего диапазона в активном bucket
 */
export const selectCurrentCoverage = createSelector(
    [
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldCurrentRange(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldOriginalRange(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldCurrentBucketMs(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) => {
            const bucketMs = selectFieldCurrentBucketMs(state, contextId, fieldName);
            if (!bucketMs) return [];
            return selectTilesByBucket(state, contextId, fieldName, bucketMs);
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
 * РЕФАКТОРИНГ: Используем TileSystemCore
 * Вычисляет покрытие для произвольного диапазона в указанном bucket
 */
export const selectBucketCoverageForRange = createSelector(
    [
        (
            _state: RootState,
            _contextId: Guid,
            _fieldName: FieldName,
            _bucketMs: BucketsMs,
            fromMs: number
        ) => fromMs,
        (
            _state: RootState,
            _contextId: Guid,
            _fieldName: FieldName,
            _bucketMs: BucketsMs,
            _fromMs: number,
            toMs: number
        ) => toMs,
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldOriginalRange(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName, bucketMs: BucketsMs) =>
            selectTilesByBucket(state, contextId, fieldName, bucketMs),
    ],
    (fromMs, toMs, originalRange, tiles): CoverageResult => {
        if (!originalRange) {
            return { coverage: 0, gaps: [], coveredRanges: [] };
        }

        const gapsResult = TileSystemCore.findGaps(originalRange, tiles, { fromMs, toMs });

        return {
            coverage: gapsResult.coverage,
            gaps: gapsResult.gaps.map((g) => ({
                fromMs: g.fromMs,
                toMs: g.toMs,
            })),
            coveredRanges: [],
        };
    }
);

/**
 * ИСПРАВЛЕНО: Передаем originalRange в DataProxyService
 * Выбирает оптимальные данные для отображения на графике
 */
export const selectOptimalData = createSelector(
    [
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldCurrentBucketMs(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldCurrentRange(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldOriginalRange(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldSeriesLevels(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectAvailableBuckets(state, contextId, fieldName),
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