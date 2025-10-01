// store/selectors/4_visualization.selectors.ts
// СЛОЙ ВИЗУАЛИЗАЦИИ: данные в UI-ready формате для React-компонентов

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type {FieldName, TimeRange, BucketsMs, DataQuality} from '@charts/charts/core/types/chart.types';

import {
    selectOptimalData,
} from './dataProxy.selectors';
import type {SeriesBinDto} from "@charts/charts/shared/dtos/SeriesBinDto.ts.ts";
import {
    selectAllViews,
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange, selectFieldView, selectSyncEnabled, selectSyncFields
} from "@charts/charts/core/store/selectors/base.selectors.ts";
import {selectLoadingMetrics} from "@charts/charts/core/store/selectors/orchestration.selectors.ts";


// ============================================
// ТИПЫ
// ============================================

/**
 * Точка данных для ECharts: [timestamp_ms, value]
 */
export type EChartsPoint = readonly [number, number];

/**
 * Полные данные для отрисовки графика
 */
export interface ChartRenderData {
    readonly points: readonly EChartsPoint[];
    readonly range: TimeRange | undefined;
    readonly bucketMs: BucketsMs | undefined;
    readonly quality: DataQuality;
    readonly isEmpty: boolean;
}

/**
 * Статистика для UI (индикаторы, дебаг-панель)
 */
export interface ChartStats {
    readonly totalPoints: number;
    readonly visiblePoints: number;
    readonly coverage: number;
    readonly gapsCount: number;
    readonly quality: DataQuality;
    readonly isLoading: boolean;
    readonly loadingProgress: number;
    readonly density: number; // точек на пиксель
}

/**
 * Видимые данные в viewport (оптимизация для больших датасетов)
 */
export interface ViewportData {
    readonly visible: readonly EChartsPoint[];
    readonly startIdx: number;
    readonly endIdx: number;
    readonly total: number;
}

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Конвертировать SeriesBinDto в ECharts точку
 */
function binToEChartsPoint(bin: SeriesBinDto): EChartsPoint | null {
    if (bin.avg === null) return null;
    return [bin.t.getTime(), bin.avg!];
}

/**
 * Бинарный поиск начального индекса
 */
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

/**
 * Бинарный поиск конечного индекса
 */
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

// ============================================
// ГЛАВНЫЙ СЕЛЕКТОР: ДАННЫЕ ДЛЯ ГРАФИКА
// ============================================

/**
 * Данные в формате ECharts, готовые для setOption
 */
export const selectChartRenderData = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectOptimalData(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentRange(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentBucketMs(state, fieldName)
    ],
    (optimalData, range, bucketMs): ChartRenderData => {
        // Конвертируем bins в ECharts points
        const points: EChartsPoint[] = [];
        for (const bin of optimalData.data) {
            const point = binToEChartsPoint(bin);
            if (point) {
                points.push(point);
            }
        }

        return {
            points,
            range,
            bucketMs,
            quality: optimalData.quality,
            isEmpty: points.length === 0
        };
    }
);

// ============================================
// VIEWPORT DATA (оптимизация)
// ============================================

/**
 * Только точки в текущем видимом диапазоне
 */
export const selectViewportData = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectChartRenderData(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldCurrentRange(state, fieldName)
    ],
    (renderData, range): ViewportData => {
        if (!range || renderData.points.length === 0) {
            return {
                visible: [],
                startIdx: 0,
                endIdx: 0,
                total: 0
            };
        }

        const fromMs = range.from.getTime();
        const toMs = range.to.getTime();

        const startIdx = binarySearchStart(renderData.points, fromMs);
        const endIdx = binarySearchEnd(renderData.points, toMs);

        return {
            visible: renderData.points.slice(startIdx, endIdx + 1),
            startIdx,
            endIdx,
            total: renderData.points.length
        };
    }
);

// ============================================
// СТАТИСТИКА ДЛЯ UI
// ============================================

/**
 * Статистика для индикаторов и дебаг-панели
 */
export const selectChartStats = createSelector(
    [
        (state: RootState, fieldName: FieldName) => selectOptimalData(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectViewportData(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectLoadingMetrics(state, fieldName),
        (state: RootState, fieldName: FieldName) => selectFieldView(state, fieldName)
    ],
    (optimalData, viewport, loading, view): ChartStats => {
        const density = view?.px ? viewport.visible.length / view.px : 0;

        return {
            totalPoints: optimalData.data.length,
            visiblePoints: viewport.visible.length,
            coverage: optimalData.coverage,
            gapsCount: optimalData.gaps.length,
            quality: optimalData.quality,
            isLoading: loading.isLoading,
            loadingProgress: loading.progress,
            density
        };
    }
);

// ============================================
// DOWNSAMPLING (для очень больших датасетов)
// ============================================

/**
 * LTTB downsampling алгоритм
 */
function downsampleLTTB(
    points: readonly EChartsPoint[],
    targetCount: number
): readonly EChartsPoint[] {
    if (points.length <= targetCount) return points;

    const result: EChartsPoint[] = [];
    const bucketSize = (points.length - 2) / (targetCount - 2);

    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return points;

    result.push(first);

    let a = 0;

    for (let i = 0; i < targetCount - 2; i++) {
        const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
        const avgRangeEnd = Math.min(
            Math.floor((i + 2) * bucketSize) + 1,
            points.length
        );

        let avgX = 0;
        let avgY = 0;
        let avgCount = 0;

        for (let j = avgRangeStart; j < avgRangeEnd; j++) {
            const point = points[j];
            if (point) {
                avgX += point[0];
                avgY += point[1];
                avgCount++;
            }
        }

        if (avgCount > 0) {
            avgX /= avgCount;
            avgY /= avgCount;
        }

        const rangeOffs = Math.floor(i * bucketSize) + 1;
        const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

        const pointA = points[a];
        if (!pointA) continue;

        let maxArea = -1;
        let maxAreaPoint: EChartsPoint | undefined;

        for (let j = rangeOffs; j < rangeTo; j++) {
            const pointB = points[j];
            if (!pointB) continue;

            const area = Math.abs(
                (pointA[0] - avgX) * (pointB[1] - pointA[1]) -
                (pointA[0] - pointB[0]) * (avgY - pointA[1])
            );

            if (area > maxArea) {
                maxArea = area;
                maxAreaPoint = pointB;
                a = j;
            }
        }

        if (maxAreaPoint) {
            result.push(maxAreaPoint);
        }
    }

    result.push(last);
    return result;
}

/**
 * Downsampled данные если точек > 5000
 */
export const selectDownsampledData = createSelector(
    [selectViewportData],
    (viewport): readonly EChartsPoint[] => {
        const MAX_POINTS = 5000;

        if (viewport.visible.length <= MAX_POINTS) {
            return viewport.visible;
        }

        return downsampleLTTB(viewport.visible, MAX_POINTS);
    }
);

// ============================================
// СИНХРОНИЗАЦИЯ ГРАФИКОВ
// ============================================

/**
 * Данные всех синхронизированных графиков
 */
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