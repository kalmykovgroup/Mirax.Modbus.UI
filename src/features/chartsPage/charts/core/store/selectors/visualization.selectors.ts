// visualization.selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import { selectOptimalData } from './dataProxy.selectors';
import {
    selectAllViews,
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange,
    selectSyncEnabled,
    selectSyncFields
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import { selectLoadingMetrics } from "@chartsPage/charts/core/store/selectors/orchestration.selectors.ts";
import type { SeriesBinDto } from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";
import type { BucketsMs, DataQuality, FieldName } from "@chartsPage/charts/core/store/types/chart.types.ts";

// ============================================
// ТИПЫ
// ============================================

export type EChartsPoint = readonly [number, number];

export interface ChartRenderData {
    readonly avgPoints: readonly EChartsPoint[];
    readonly minPoints: readonly EChartsPoint[];
    readonly maxPoints: readonly EChartsPoint[];
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
    readonly avg: readonly EChartsPoint[];
    readonly min: readonly EChartsPoint[];
    readonly max: readonly EChartsPoint[];
}

const pointsCache = new WeakMap<readonly SeriesBinDto[], PointsCache>();

/**
 *  ИСПРАВЛЕНО: Убрана фильтрация bin.avg == null
 *
 * Теперь включаем ВСЕ bins, даже с null значениями.
 * ECharts сам обработает null как gap в линии.
 */
function convertBinsToPoints(bins: readonly SeriesBinDto[]): PointsCache {
    const cached = pointsCache.get(bins);
    if (cached) return cached;

    const avg: EChartsPoint[] = [];
    const min: EChartsPoint[] = [];
    const max: EChartsPoint[] = [];

    let nullCount = 0;

    for (const bin of bins) {
        const time = bin.t.getTime();

        //  Включаем ВСЕ bins, даже с null
        avg.push([time, bin.avg ?? null as any]);
        min.push([time, bin.min ?? bin.avg ?? null as any]);
        max.push([time, bin.max ?? bin.avg ?? null as any]);

        if (bin.avg == null) {
            nullCount++;
        }
    }

    if (nullCount > 0) {
        console.log('[convertBinsToPoints] Bins with null avg:', {
            total: bins.length,
            nulls: nullCount
        });
    }

    const result: PointsCache = {
        avg: Object.freeze(avg) as readonly EChartsPoint[],
        min: Object.freeze(min) as readonly EChartsPoint[],
        max: Object.freeze(max) as readonly EChartsPoint[]
    };

    pointsCache.set(bins, result);
    return result;

    // ❌ ЗАКОММЕНТИРОВАНО: фильтрация null
    // for (const bin of bins) {
    //     if (bin.avg == null) continue;  // ← Пропускали bins с null
    //
    //     const time = bin.t.getTime();
    //     avg.push([time, bin.avg]);
    //     min.push([time, bin.min ?? bin.avg]);
    //     max.push([time, bin.max ?? bin.avg]);
    // }
}

// ============================================
// СЕЛЕКТОРЫ
// ============================================

export const selectChartRenderData = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectOptimalData(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentBucketMs(state, fieldName)
    ],
    (optimalData, bucketMs): ChartRenderData => {
        const points = convertBinsToPoints(optimalData.data);

        return {
            avgPoints: points.avg,
            minPoints: points.min,
            maxPoints: points.max,
            bucketMs,
            quality: optimalData.quality,
            isEmpty: points.avg.length === 0
        };
    }
);

export const selectChartStats = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectOptimalData(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectLoadingMetrics(state, fieldName)
    ],
    (optimalData, loading): ChartStats => {
        return {
            totalPoints: optimalData.data.length,
            coverage: optimalData.coverage,
            gapsCount: optimalData.gaps.length,
            quality: optimalData.quality,
            isLoading: loading.isLoading,
            loadingProgress: loading.progress
        };
    }
);

export const selectSyncedChartsData = createSelector(
    [selectSyncEnabled, selectSyncFields, selectAllViews],
    (syncEnabled, syncFields, allViews) => {
        if (!syncEnabled) return [];

        return syncFields.map(field => ({
            fieldName: field.name,
            hasView: field.name in allViews,
            hasData: allViews[field.name]?.seriesLevel !== undefined
        }));
    }
);

export const selectVisiblePointsCount = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectChartRenderData(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentRange(state, fieldName)
    ],
    (chartData, currentRange): number => {
        if (!currentRange || chartData.avgPoints.length === 0) {
            return chartData.avgPoints.length;
        }

        const fromMs = currentRange.from.getTime();
        const toMs = currentRange.to.getTime();

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