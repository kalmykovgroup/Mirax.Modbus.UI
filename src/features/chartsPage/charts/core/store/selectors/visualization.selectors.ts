// store/selectors/visualization.selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { FieldName, BucketsMs, DataQuality } from '@chartsPage/charts/core/store/types/loading.types';
import { selectOptimalData } from './dataProxy.selectors';
import {
    selectAllViews,
    selectFieldCurrentBucketMs,
    selectSyncEnabled,
    selectSyncFields
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import { selectLoadingMetrics } from "@chartsPage/charts/core/store/selectors/orchestration.selectors.ts";
import type { SeriesBinDto } from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";

export type EChartsPoint = readonly [number, number];

export interface ChartRenderData {
    readonly points: readonly EChartsPoint[];
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

function binToEChartsPoint(bin: SeriesBinDto): EChartsPoint | null {
    if (bin.avg === undefined || bin.avg === null) return null;
    return [bin.t.getTime(), bin.avg];
}

// ============================================
// ✅ WEAKMAP КЕШ
// ============================================

const pointsCache = new WeakMap<readonly SeriesBinDto[], readonly EChartsPoint[]>();

function convertBinsToPoints(bins: readonly SeriesBinDto[]): readonly EChartsPoint[] {
    const cached = pointsCache.get(bins);
    if (cached) {
        return cached;
    }

    const points: EChartsPoint[] = [];
    for (const bin of bins) {
        const point = binToEChartsPoint(bin);
        if (point) {
            points.push(point);
        }
    }

    const frozenPoints = Object.freeze(points) as readonly EChartsPoint[];
    pointsCache.set(bins, frozenPoints);

    return frozenPoints;
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
        // ✅ Используем кеш: если bins не изменились — та же ссылка на points
        const points = convertBinsToPoints(optimalData.data);

        return {
            points,
            bucketMs,
            quality: optimalData.quality,
            isEmpty: points.length === 0
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