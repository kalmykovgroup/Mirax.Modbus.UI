// src/features/chartsPage/charts/core/store/types/tile-system.types.ts

import type { SeriesBinDto } from '@chartsPage/charts/core/dtos/SeriesBinDto';
import type {CoverageInterval} from "@chartsPage/charts/core/store/types/chart.types.ts";

/**
 * Статус тайла
 */
export type TileStatus = 'ready' | 'loading' | 'error';

/**
 * Тайл с временным диапазоном и данными
 */
export interface Tile {
    readonly coverageInterval: CoverageInterval;
    readonly bins: readonly SeriesBinDto[];
    readonly status: TileStatus;
    readonly error?: string | undefined;
    readonly requestId?: string | undefined;
    readonly loadedAt?: number | undefined;
}

/**
 * Исходный диапазон для управления тайлами
 */
export interface OriginalRange {
    readonly fromMs: number;
    readonly toMs: number;
}

/**
 * Система управления тайлами для одного bucket-уровня
 */
export interface TileSystem {
    readonly originalRange: OriginalRange;
    readonly tiles: readonly Tile[];
    readonly totalBins: number; // Кеш: общее количество bins
    readonly lastUpdated: number; // timestamp последнего обновления
}

/**
 * Результат операции добавления тайла
 */
export interface AddTileResult {
    readonly tiles: readonly Tile[];
    readonly wasAdded: boolean;
    readonly wasMerged: boolean;
    readonly affectedIndices: readonly number[];
}

/**
 * Результат поиска gaps
 */
export interface FindGapsResult {
    readonly gaps: readonly CoverageInterval[];
    readonly coverage: number; // 0-100%
    readonly hasFull: boolean; // true если покрытие 100%
}

/**
 * Тип перекрытия двух интервалов
 */
export type OverlapType =
    | 'none'        // Нет перекрытия
    | 'full'        // interval1 полностью внутри interval2
    | 'partial'     // Частичное перекрытие
    | 'contains';   // interval1 содержит interval2

/**
 * Результат анализа перекрытия
 */
export interface OverlapAnalysis {
    readonly type: OverlapType;
    readonly overlapFrom?: number | undefined;
    readonly overlapTo?: number | undefined;
}