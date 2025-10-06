// src/features/chartsPage/charts/core/store/selectors/tile-system.selectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { FieldName, BucketsMs } from '../types/chart.types';
import type { TileSystem, FindGapsResult, CoverageInterval } from '../types/tile-system.types';
import { TileSystemCore } from '../utils/TileSystemCore';

/**
 * Получить систему для поля и bucket
 */
export const selectTileSystem = (
    state: RootState,
    field: FieldName,
    bucketMs: BucketsMs
): TileSystem | undefined => {
    return state.tileSystem.systems[field]?.[bucketMs];
};

/**
 * Получить gaps для системы
 */
export const selectGaps = createSelector(
    [
        (state: RootState, field: FieldName, bucketMs: BucketsMs) =>
            selectTileSystem(state, field, bucketMs),
        (_state: RootState, _field: FieldName, _bucketMs: BucketsMs, targetInterval?: CoverageInterval | undefined) =>
            targetInterval
    ],
    (system, targetInterval): FindGapsResult => {
        if (!system) {
            return {
                gaps: [],
                coverage: 0,
                hasFull: false
            };
        }

        return TileSystemCore.findGaps(system, targetInterval);
    }
);

/**
 * Получить статистику системы
 */
export const selectTileStats = createSelector(
    [
        (state: RootState, field: FieldName, bucketMs: BucketsMs) =>
            selectTileSystem(state, field, bucketMs)
    ],
    (system) => {
        if (!system) {
            return {
                totalTiles: 0,
                readyTiles: 0,
                loadingTiles: 0,
                errorTiles: 0,
                totalBins: 0,
                coverage: 0
            };
        }

        return TileSystemCore.getStats(system);
    }
);

/**
 * Проверить нужна ли загрузка для интервала
 */
export const selectNeedsLoad = createSelector(
    [
        (state: RootState, field: FieldName, bucketMs: BucketsMs, interval: CoverageInterval) =>
            selectGaps(state, field, bucketMs, interval)
    ],
    (gapsResult): boolean => {
        return gapsResult.coverage < 95;
    }
);

/**
 * Получить все тайлы системы
 */
export const selectTiles = createSelector(
    [
        (state: RootState, field: FieldName, bucketMs: BucketsMs) =>
            selectTileSystem(state, field, bucketMs)
    ],
    (system) => system?.tiles ?? []
);