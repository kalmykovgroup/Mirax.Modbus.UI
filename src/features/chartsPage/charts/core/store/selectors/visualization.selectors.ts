// visualization.selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import { selectOptimalData } from './dataProxy.selectors';
import {
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange, selectFieldView,
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import { selectLoadingMetrics } from "@chartsPage/charts/core/store/selectors/orchestration.selectors.ts";
import type { SeriesBinDto } from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";
import type {
    BucketsMs,
    CoverageInterval,
    DataQuality,
    FieldName, GapsInfo
} from "@chartsPage/charts/core/store/types/chart.types.ts";
import {TileSystemCore} from "@chartsPage/charts/core/store/tile-system/TileSystemCore.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

// ============================================
// ТИПЫ
// ============================================

export type EChartsPoint = readonly [number, number, number];

export interface ChartRenderData {
     avgPoints: EChartsPoint[];// [time, value, count]
     minPoints: EChartsPoint[];// [time, value, count]
     maxPoints: EChartsPoint[];// [time, value, count]
    readonly bucketMs: BucketsMs | undefined;
    readonly quality: DataQuality;
    readonly isEmpty: boolean;
}

export interface ChartStats {
    readonly totalPoints: number;
    readonly coverage: number;
    readonly gapsCount: number;
    readonly quality: DataQuality;
    readonly isLoading: boolean;
    readonly loadingProgress: number;
}

// ============================================
// КЕШ
// ============================================

interface PointsCache {
    readonly avg:  EChartsPoint[];
    readonly min:  EChartsPoint[];
    readonly max:  EChartsPoint[];
}

const pointsCache = new WeakMap<readonly SeriesBinDto[], PointsCache>();

/**
 *  ИСПРАВЛЕНО: Убрана фильтрация bin.avg == null
 *
 * Теперь включаем ВСЕ bins, даже с null значениями.
 * ECharts сам обработает null как gap в линии.
 */
function convertBinsToPoints(bins: readonly SeriesBinDto[], fieldName: string): PointsCache {
    const cached = pointsCache.get(bins);
    if (cached) return cached;

    const avg: EChartsPoint[] = [];
    const min: EChartsPoint[] = [];
    const max: EChartsPoint[] = [];

    let nullCount = 0;

    for (const bin of bins) {
        const time = bin.t;

        //    Включаем ВСЕ bins, даже с null
        // ECharts прервет линию на null значениях если connectNulls: false
        // Каждая точка хранит свой bin.count
        avg.push([time, bin.avg ?? null as any, bin.count]);
        min.push([time, bin.min ?? bin.avg ?? null as any, bin.count]);
        max.push([time, bin.max ?? bin.avg ?? null as any, bin.count]);

        if (bin.avg == null) {
            nullCount++;
        }
    }

    if (nullCount > 0) {
        console.log('[convertBinsToPoints] Bins with null avg (gaps):', {
            fieldName: fieldName,
            total: bins.length,
            nulls: nullCount,
            bins: bins
        });
    }

    const result: PointsCache = {
        avg: Object.freeze(avg) as EChartsPoint[],
        min: Object.freeze(min) as EChartsPoint[],
        max: Object.freeze(max) as EChartsPoint[],
    };

    pointsCache.set(bins, result);
    return result;
}
// СЕЛЕКТОРЫ

export const selectChartRenderData = createSelector(
    [
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectOptimalData(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldCurrentBucketMs(state, contextId, fieldName),
        (_state: RootState, _contextId: Guid, fieldName: FieldName) => fieldName,
    ],
    (optimalData, bucketMs, fieldName): ChartRenderData => {
        const points = convertBinsToPoints(optimalData.data, fieldName);

        return {
            avgPoints: points.avg,
            minPoints: points.min,
            maxPoints: points.max,
            bucketMs,
            quality: optimalData.quality,
            isEmpty: points.avg.length === 0,
        };
    }
);

export const selectChartStats = createSelector(
    [
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectOptimalData(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectLoadingMetrics(state, contextId, fieldName),
    ],
    (optimalData, loading): ChartStats => {
        return {
            totalPoints: optimalData.data.length,
            coverage: optimalData.coverage,
            gapsCount: optimalData.gaps.length,
            quality: optimalData.quality,
            isLoading: loading.isLoading,
            loadingProgress: loading.progress,
        };
    }
);



export const selectVisiblePointsCount = createSelector(
    [
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectChartRenderData(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldCurrentRange(state, contextId, fieldName),
    ],
    (chartData, currentRange): number => {
        if (!currentRange || chartData.avgPoints.length === 0) {
            return chartData.avgPoints.length;
        }

        const fromMs = currentRange.fromMs;
        const toMs = currentRange.toMs;

        const startIdx = binarySearchStart(chartData.avgPoints, fromMs);
        const endIdx = binarySearchEnd(chartData.avgPoints, toMs);

        return Math.max(0, endIdx - startIdx + 1);
    }
);

// ============================================
// УТИЛИТЫ
// ============================================

function binarySearchStart(points: readonly EChartsPoint[], targetMs: number): number {
    let left = 0;
    let right = points.length - 1;
    let result = 0;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const point = points[mid];
        if (!point) break;

        if (point[0] < targetMs) {
            left = mid + 1;
        } else {
            result = mid;
            right = mid - 1;
        }
    }

    return result;
}

function binarySearchEnd(points: readonly EChartsPoint[], targetMs: number): number {
    let left = 0;
    let right = points.length - 1;
    let result = points.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const point = points[mid];
        if (!point) break;

        if (point[0] <= targetMs) {
            result = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return result;
}


export const selectFieldGaps = createSelector(
    [
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldView(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldCurrentBucketMs(state, contextId, fieldName),
        (state: RootState, contextId: Guid, fieldName: FieldName) =>
            selectFieldCurrentRange(state, contextId, fieldName),
    ],
    (fieldView, currentBucketMs, currentRange): GapsInfo => {
        if (!fieldView || !currentBucketMs || !currentRange || !fieldView.originalRange) {
            return EMPTY_GAPS_INFO;
        }

        const tiles = fieldView.seriesLevel[currentBucketMs] ?? [];

        const targetInterval: CoverageInterval = {
            fromMs: currentRange.fromMs,
            toMs: currentRange.toMs,
        };

        const gapsResult = TileSystemCore.findGaps(fieldView.originalRange, tiles, targetInterval);

        const dataGaps: CoverageInterval[] = [];
        const loadingGaps: CoverageInterval[] = [];

        for (const gap of gapsResult.gaps) {
            const hasLoadingTile = tiles.some(
                (t) =>
                    t.status === 'loading' &&
                    t.coverageInterval.fromMs <= gap.fromMs &&
                    t.coverageInterval.toMs >= gap.toMs
            );

            if (hasLoadingTile) {
                loadingGaps.push(gap);
            } else {
                dataGaps.push(gap);
            }
        }

        if (dataGaps.length === 0 && loadingGaps.length === 0) {
            return EMPTY_GAPS_INFO;
        }

        return {
            dataGaps: Object.freeze(dataGaps),
            loadingGaps: Object.freeze(loadingGaps),
        };
    }
);

const EMPTY_GAPS_INFO: GapsInfo = Object.freeze({
    dataGaps: Object.freeze([]),
    loadingGaps: Object.freeze([]),
});