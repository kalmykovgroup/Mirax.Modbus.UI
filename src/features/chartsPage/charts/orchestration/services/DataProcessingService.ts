// orchestration/services/DataProcessingService.ts

import type { Dispatch } from '@reduxjs/toolkit';
import type {
    BucketsMs,
    CoverageInterval,
    SeriesTile,
    FieldName,
    OriginalRange
} from '@chartsPage/charts/core/store/types/chart.types';
import { batchUpdateTiles } from '@chartsPage/charts/core/store/chartsSlice';
import { selectFieldView } from '@chartsPage/charts/core/store/selectors/base.selectors';
import type { RootState } from '@/store/store';
import type { MultiSeriesResponse } from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type { SeriesBinDto } from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";
import type { GetMultiSeriesRequest } from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest.ts";
import { TileSystemCore } from "@chartsPage/charts/core/store/tile-system/TileSystemCore.ts";

// ============================================
// ТИПЫ
// ============================================

export interface ProcessServerResponseParams {
    readonly response: MultiSeriesResponse;
    readonly bucketMs: BucketsMs;
    readonly requestedInterval: CoverageInterval;
    readonly dispatch: Dispatch;
    readonly getState: () => RootState;
}

interface ProcessFieldResult {
    readonly field: FieldName;
    readonly success: boolean;
    readonly newTiles: SeriesTile[] | null;
    readonly binsReceived: number;
    readonly error?: string | undefined;
}

// ============================================
// СЕРВИС
// ============================================

export class DataProcessingService {

    static processServerResponse(params: ProcessServerResponseParams): void {
        const { response, bucketMs, requestedInterval, dispatch, getState } = params;


        const results: ProcessFieldResult[] = [];
        const updates: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            tiles: SeriesTile[];
        }> = [];

        for (const series of response.series) {
            const result = this.processFieldSeries({
                fieldName: series.field.name,
                bins: series.bins,
                bucketMs,
                requestedInterval,
                getState
            });

            results.push(result);

            if (result.success && result.newTiles) {
                updates.push({
                    field: series.field.name,
                    bucketMs,
                    tiles: result.newTiles
                });
            }
        }

        if (updates.length > 0) {
            dispatch(batchUpdateTiles(updates));
        }

    }


    private static processFieldSeries(params: {
        readonly fieldName: FieldName;
        readonly bins: readonly any[];
        readonly bucketMs: BucketsMs;
        readonly requestedInterval: CoverageInterval;
        readonly getState: () => RootState;
    }): ProcessFieldResult {
        const { fieldName, bins, bucketMs, requestedInterval, getState } = params;

        try {
            const state = getState();
            const fieldView = selectFieldView(state, fieldName);

            if (!fieldView) {
                return {
                    field: fieldName,
                    success: false,
                    newTiles: null,
                    binsReceived: 0,
                    error: 'Field view not found'
                };
            }

            if (!fieldView.originalRange) {
                return {
                    field: fieldName,
                    success: false,
                    newTiles: null,
                    binsReceived: 0,
                    error: 'Original range not found'
                };
            }

            const existingTiles = fieldView.seriesLevel[bucketMs] ?? [];
            const convertedBins = this.convertAndFilterBins(bins, requestedInterval);

            const newTile: SeriesTile = {
                coverageInterval: requestedInterval,
                bins: convertedBins,
                status: 'ready',
                loadedAt: Date.now()
            };

            //   ИСПРАВЛЕНО: Умный callback для фильтрации легитимных замен
            const addResult = TileSystemCore.addTile(
                fieldView.originalRange,
                [...existingTiles],
                newTile,
                {
                    strategy: 'replace',
                    validate: true,
                    onDataLoss: (lostTile) => {
                        //   Проверка 1: Точное совпадение интервалов → повторная загрузка (игнорируем)
                        const isSameInterval =
                            lostTile.coverageInterval.fromMs === requestedInterval.fromMs &&
                            lostTile.coverageInterval.toMs === requestedInterval.toMs;

                        if (isSameInterval) {
                            return;
                        }

                        //   Проверка 2: Новый тайл содержит старый (zoom in) → легитимная замена (debug-уровень)
                        const isZoomIn =
                            requestedInterval.fromMs <= lostTile.coverageInterval.fromMs &&
                            requestedInterval.toMs >= lostTile.coverageInterval.toMs &&
                            convertedBins.length > lostTile.bins.length;

                        if (isZoomIn) {
                            console.debug('[processFieldSeries] Zoom refinement (expected):', {
                                field: fieldName,
                                oldInterval: {
                                    from: new Date(lostTile.coverageInterval.fromMs).toISOString(),
                                    to: new Date(lostTile.coverageInterval.toMs).toISOString()
                                },
                                newInterval: {
                                    from: new Date(requestedInterval.fromMs).toISOString(),
                                    to: new Date(requestedInterval.toMs).toISOString()
                                },
                                oldBins: lostTile.bins.length,
                                newBins: convertedBins.length
                            });
                            return;
                        }

                        //   Проверка 3: Реальная потеря данных → WARNING
                        console.warn('[processFieldSeries] ⚠️ Unexpected data loss:', {
                            field: fieldName,
                            lostTile: {
                                interval: {
                                    from: new Date(lostTile.coverageInterval.fromMs).toISOString(),
                                    to: new Date(lostTile.coverageInterval.toMs).toISOString()
                                },
                                bins: lostTile.bins.length,
                                status: lostTile.status
                            },
                            newTile: {
                                interval: {
                                    from: new Date(requestedInterval.fromMs).toISOString(),
                                    to: new Date(requestedInterval.toMs).toISOString()
                                },
                                bins: convertedBins.length
                            },
                            reason: 'Tiles do not match expected patterns'
                        });
                    }
                }
            );

            return {
                field: fieldName,
                success: true,
                newTiles: [...addResult.tiles],
                binsReceived: convertedBins.length
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            console.error('[processFieldSeries] Error:', {
                field: fieldName,
                error: errorMessage
            });

            return {
                field: fieldName,
                success: false,
                newTiles: null,
                binsReceived: 0,
                error: errorMessage
            };
        }
    }

    /**
     *   НОВЫЙ МЕТОД: Подготовка loading тайлов
     */
    static prepareLoadingTiles(params: {
        readonly fields: readonly FieldName[];
        readonly bucketMs: BucketsMs;
        readonly loadingInterval: CoverageInterval;
        readonly requestId: string;
        readonly getState: () => RootState;
    }): Array<{ field: FieldName; bucketMs: BucketsMs; tiles: SeriesTile[] }> {
        const { fields, bucketMs, loadingInterval, requestId, getState } = params;

        const updates: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            tiles: SeriesTile[];
        }> = [];

        const state = getState();

        for (const fieldName of fields) {
            const fieldView = selectFieldView(state, fieldName);

            if (!fieldView || !fieldView.originalRange) {
                console.warn('[prepareLoadingTiles] No view for field:', fieldName);
                continue;
            }

            const existingTiles = fieldView.seriesLevel[bucketMs] ?? [];

            // Проверяем есть ли уже loading тайл для этого интервала
            const hasLoadingTile = existingTiles.some(t =>
                t.status === 'loading' &&
                t.coverageInterval.fromMs === loadingInterval.fromMs &&
                t.coverageInterval.toMs === loadingInterval.toMs
            );

            if (hasLoadingTile) {
                console.log('[prepareLoadingTiles] Loading tile exists:', fieldName);
                continue;
            }

            // Создаем loading тайл
            const loadingTile: SeriesTile = {
                coverageInterval: loadingInterval,
                bins: [],
                status: 'loading',
                requestId
            };

            //   Используем TileSystemCore
            const addResult = TileSystemCore.addTile(
                fieldView.originalRange,
                [...existingTiles],
                loadingTile,
                {
                    strategy: 'replace',
                    validate: false // Loading тайлы могут перекрываться
                }
            );

            updates.push({
                field: fieldName,
                bucketMs,
                tiles: [...addResult.tiles]
            });

        }

        return updates;
    }

    // ... остальные методы (analyzeLoadNeeds, calculateLoadInterval, и т.д.) остаются без изменений

    /**
     * Анализ необходимости загрузки
     */
    static analyzeLoadNeeds(
        fieldName: FieldName,
        from: number,
        to: number,
        bucketMs: BucketsMs,
        px: number,
        getState: () => RootState
    ): GetMultiSeriesRequest | false {
        const state = getState();
        const fieldView = selectFieldView(state, fieldName);

        if (!fieldView || !fieldView.originalRange) {
            console.warn('[analyzeLoadNeeds] No field view or original range');
            return false;
        }

        const tiles = fieldView.seriesLevel[bucketMs] ?? [];

        // Выравниваем границы
        const alignedFrom = Math.floor(from / bucketMs) * bucketMs;
        const alignedTo = Math.ceil(to / bucketMs) * bucketMs;


       // КРИТИЧНО: Проверяем gaps СРАЗУ, до всех остальных проверок
        const gapsResult = TileSystemCore.findGaps(
            fieldView.originalRange,
            tiles,
            { fromMs: alignedFrom, toMs: alignedTo }
        );

        // Ранний выход: полное покрытие
        if (gapsResult.hasFull || gapsResult.gaps.length === 0) {
            return false;
        }

     //    Проверяем loading tiles в gaps
        const hasLoadingInGaps = gapsResult.gaps.some(gap => {
            return tiles.some(t =>
                t.status === 'loading' &&
                t.coverageInterval.fromMs <= gap.fromMs &&
                t.coverageInterval.toMs >= gap.toMs
            );
        });

        if (hasLoadingInGaps) {
            return false;
        }

        // БЕРЁМ ОБЪЕДИНЁННЫЙ GAP (или самый большой)
        const targetGap = this.selectTargetGap(gapsResult.gaps);


        // ТЕПЕРЬ расширяем gap если близко к границам/тайлам
        const optimizedInterval = this.optimizeGapInterval({
            gap: targetGap,
            tiles,
            originalRange: fieldView.originalRange,
            bucketMs,
            minBucketsThreshold: 3,
            proximityThreshold: 0.2
        });


        // Формируем запрос
        const template = state.charts.template;
        if (!template) {
            console.error('[analyzeLoadNeeds] No template');
            return false;
        }

        const field = template.selectedFields.find(f => f.name === fieldName);
        if (!field) {
            console.error('[analyzeLoadNeeds] Field not found:', fieldName);
            return false;
        }

        const selected = state.charts.syncEnabled ? [...state.charts.syncFields, field] : [field]

        return {
            template: {...template,
                selectedFields: selected,
                resolvedFromMs: optimizedInterval.fromMs,
                resolvedToMs: optimizedInterval.toMs,
            },
            px,
            bucketMs
        };
    }

    /**
     * Выбор целевого gap
     */
    private static selectTargetGap(
        gaps: readonly CoverageInterval[]
    ): CoverageInterval {
        if (gaps.length === 0) {
            throw new Error('[selectTargetGap] No gaps provided');
        }

        if (gaps.length === 1) {
            return gaps[0]!;
        }

        // Стратегия: объединяем все gaps если их <= 3
        // Иначе берём самый большой
        if (gaps.length <= 3) {
            const firstGap = gaps[0]!;
            const lastGap = gaps[gaps.length - 1]!;

            return {
                fromMs: firstGap.fromMs,
                toMs: lastGap.toMs
            };
        }

        // Находим самый большой gap
        let maxGap = gaps[0]!;
        let maxSize = maxGap.toMs - maxGap.fromMs;

        for (let i = 1; i < gaps.length; i++) {
            const gap = gaps[i]!;
            const size = gap.toMs - gap.fromMs;
            if (size > maxSize) {
                maxGap = gap;
                maxSize = size;
            }
        }

        return maxGap;
    }

    /**
     *  Оптимизация gap (расширение до границ/тайлов)
     */
    private static optimizeGapInterval(params: {
        readonly gap: CoverageInterval;
        readonly tiles: readonly SeriesTile[];
        readonly originalRange: OriginalRange;
        readonly bucketMs: BucketsMs;
        readonly minBucketsThreshold: number;
        readonly proximityThreshold: number;
    }): CoverageInterval {
        const {
            gap,
            tiles,
            originalRange,
            bucketMs,
            minBucketsThreshold,
            proximityThreshold
        } = params;

        let optimalFrom = gap.fromMs;
        let optimalTo = gap.toMs;

        const gapSizeMs = gap.toMs - gap.fromMs;

        // Расширяем до границ графика если близко
        const distToStart = gap.fromMs - originalRange.fromMs;
        const distToStartBuckets = Math.floor(distToStart / bucketMs);
        const relDistStart = gapSizeMs > 0 ? distToStart / gapSizeMs : 0;

        if (
            distToStartBuckets <= minBucketsThreshold ||
            relDistStart <= proximityThreshold
        ) {
            optimalFrom = Math.floor(originalRange.fromMs / bucketMs) * bucketMs;
        }

        const distToEnd = originalRange.toMs - gap.toMs;
        const distToEndBuckets = Math.floor(distToEnd / bucketMs);
        const relDistEnd = gapSizeMs > 0 ? distToEnd / gapSizeMs : 0;

        if (
            distToEndBuckets <= minBucketsThreshold ||
            relDistEnd <= proximityThreshold
        ) {
            optimalTo = Math.ceil(originalRange.toMs / bucketMs) * bucketMs;
        }

        // Расширяем до соседних тайлов если близко
        const activeTiles = tiles
            .filter(t => t.status === 'ready' || t.status === 'loading')
            .sort((a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs);

        // Левый тайл
        const leftTiles = activeTiles.filter(t => t.coverageInterval.toMs <= gap.fromMs);
        if (leftTiles.length > 0) {
            const nearestLeft = leftTiles[leftTiles.length - 1]!;
            const gapToLeft = gap.fromMs - nearestLeft.coverageInterval.toMs;
            const gapBuckets = Math.floor(gapToLeft / bucketMs);
            const relGap = gapSizeMs > 0 ? gapToLeft / gapSizeMs : 0;

            if (gapBuckets <= minBucketsThreshold || relGap <= proximityThreshold) {
                optimalFrom = nearestLeft.coverageInterval.toMs;
                console.log('[optimizeGapInterval] Extended to left tile:', {
                    gapBuckets,
                    relGap: (relGap * 100).toFixed(1) + '%'
                });
            }
        }

        // Правый тайл
        const rightTiles = activeTiles.filter(t => t.coverageInterval.fromMs >= gap.toMs);
        if (rightTiles.length > 0) {
            const nearestRight = rightTiles[0]!;
            const gapToRight = nearestRight.coverageInterval.fromMs - gap.toMs;
            const gapBuckets = Math.floor(gapToRight / bucketMs);
            const relGap = gapSizeMs > 0 ? gapToRight / gapSizeMs : 0;

            if (gapBuckets <= minBucketsThreshold || relGap <= proximityThreshold) {
                optimalTo = nearestRight.coverageInterval.fromMs;
            }
        }

        // Проверка минимального размера
        const finalSizeBuckets = Math.ceil((optimalTo - optimalFrom) / bucketMs);
        if (finalSizeBuckets < minBucketsThreshold) {
            const needBuckets = minBucketsThreshold - finalSizeBuckets;
            const needMs = needBuckets * bucketMs;
            const halfNeedMs = Math.floor(needMs / 2);

            optimalFrom = Math.max(
                originalRange.fromMs,
                Math.floor((optimalFrom - halfNeedMs) / bucketMs) * bucketMs
            );

            optimalTo = Math.min(
                originalRange.toMs,
                Math.ceil((optimalTo + needMs - halfNeedMs) / bucketMs) * bucketMs
            );

        }

        return {
            fromMs: optimalFrom,
            toMs: optimalTo
        };
    }



    /**
     * Конвертация и фильтрация bins
     */
    private static convertAndFilterBins(
        bins: readonly any[],
        interval: CoverageInterval
    ): SeriesBinDto[] {
        if (!bins || bins.length === 0) {
            return [];
        }

        const converted: SeriesBinDto[] = [];
        let skipped = 0;

        for (const bin of bins) {
            if (!bin || typeof bin !== 'object') {
                skipped++;
                continue;
            }



            if (isNaN(bin.t)) {
                skipped++;
                continue;
            }

            if (bin.t < interval.fromMs || bin.t >= interval.toMs) {
                skipped++;
                continue;
            }

            const hasAvg = bin.avg != null && !isNaN(Number(bin.avg));
            const hasMin = bin.min != null && !isNaN(Number(bin.min));
            const hasMax = bin.max != null && !isNaN(Number(bin.max));

            if (!hasAvg && !hasMin && !hasMax) {
                skipped++;
                continue;
            }

            const convertedBin: SeriesBinDto = {
                t: bin.t,
                avg: hasAvg ? Number(bin.avg) : undefined,
                min: hasMin ? Number(bin.min) : undefined,
                max: hasMax ? Number(bin.max) : undefined,
                count: bin.count != null && !isNaN(Number(bin.count))
                    ? Number(bin.count)
                    : 1
            };

            converted.push(convertedBin);
        }

        if (skipped > 0) {
            console.log('[convertAndFilterBins]', {
                total: bins.length,
                converted: converted.length,
                skipped
            });
        }

        converted.sort((a, b) => a.t - b.t);
        return converted;
    }

    /**
     * Проверка полного покрытия
     */
    private static checkFullCoverage(
        tiles: readonly SeriesTile[],
        from: number,
        to: number
    ): boolean {
        const readyTiles = tiles
            .filter(t => t.status === 'ready')
            .sort((a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs);

        let currentPos = from;

        for (const tile of readyTiles) {
            const tileStart = tile.coverageInterval.fromMs;
            const tileEnd = tile.coverageInterval.toMs;

            if (tileEnd <= from || tileStart >= to) {
                continue;
            }

            if (tileStart > currentPos) {
                return false;
            }

            currentPos = Math.max(currentPos, tileEnd);

            if (currentPos >= to) {
                return true;
            }
        }

        return false;
    }



    // calculateLoadInterval и вспомогательные методы остаются без изменений...
    /**
     * Расчет оптимального интервала для загрузки данных
     *
     * @returns Интервал для загрузки или null если загрузка не нужна
     */
    static calculateLoadInterval(params: {
        readonly tiles: readonly SeriesTile[];
        readonly originalRange: OriginalRange;
        readonly requestedFrom: number;
        readonly requestedTo: number;
        readonly bucketMs: BucketsMs;
        readonly minBucketsThreshold?: number | undefined;
        readonly proximityThreshold?: number | undefined;
    }): CoverageInterval | null {
        const {
            tiles,
            originalRange,
            requestedFrom,
            requestedTo,
            bucketMs,
            minBucketsThreshold = 3,
            proximityThreshold = 0.2
        } = params;

        // 1. Выравниваем границы по bucketMs
        const alignedFrom = Math.floor(requestedFrom / bucketMs) * bucketMs;
        const alignedTo = Math.ceil(requestedTo / bucketMs) * bucketMs;

        if (alignedTo <= alignedFrom) {
            console.warn('[calculateLoadInterval] Invalid range after alignment');
            return null;
        }

        // 2. Размер запроса в buckets
        const requestSizeBuckets = Math.ceil((alignedTo - alignedFrom) / bucketMs);

        // 3. Проверяем полное покрытие ready тайлами
        const hasFullCoverage = this.checkFullCoverage(tiles, alignedFrom, alignedTo);
        if (hasFullCoverage) {
            console.log('[calculateLoadInterval] Full coverage exists, no load needed');
            return null;
        }

        // 4. Проверяем наличие loading тайлов покрывающих запрос
       const hasLoadingCoverage = tiles.some(t =>
            t.status === 'loading' &&
            t.coverageInterval.fromMs <= alignedFrom &&
            t.coverageInterval.toMs >= alignedTo
        );

        if (hasLoadingCoverage) {
            console.log('[calculateLoadInterval] Already loading this range');
            return null;
        }

        // 5. Определяем оптимальные границы
        let optimalFrom = alignedFrom;
        let optimalTo = alignedTo;

        // 6. Расширяем до границ графика если близко
        const expandedToGraph = this.expandToGraphBoundaries({
            from: optimalFrom,
            to: optimalTo,
            originalRange,
            bucketMs,
            requestSizeBuckets,
            minBucketsThreshold,
            proximityThreshold
        });

        optimalFrom = expandedToGraph.from;
        optimalTo = expandedToGraph.to;

        // 7. Расширяем до соседних тайлов если близко
        const expandedToTiles = this.expandToNeighborTiles({
            tiles,
            from: optimalFrom,
            to: optimalTo,
            bucketMs,
            requestSizeBuckets,
            minBucketsThreshold,
            proximityThreshold
        });

        optimalFrom = expandedToTiles.from;
        optimalTo = expandedToTiles.to;

        // 8. Финальная проверка
        if (optimalTo <= optimalFrom) {
            console.warn('[calculateLoadInterval] Invalid final range');
            return null;
        }

        // 9. Проверяем что после расширения нет полного покрытия
        const hasFinalCoverage = this.checkFullCoverage(tiles, optimalFrom, optimalTo);
        if (hasFinalCoverage) {
            console.log('[calculateLoadInterval] Full coverage after expansion');
            return null;
        }

        // 10. Проверяем минимальный размер
        const finalSizeBuckets = Math.ceil((optimalTo - optimalFrom) / bucketMs);
        if (finalSizeBuckets < minBucketsThreshold) {
            console.log('[calculateLoadInterval] Request too small, expanding to minimum');

            // Расширяем симметрично до минимального размера
            const needBuckets = minBucketsThreshold - finalSizeBuckets;
            const needMs = needBuckets * bucketMs;
            const halfNeedMs = Math.floor(needMs / 2);

            optimalFrom = Math.max(
                originalRange.fromMs,
                Math.floor((optimalFrom - halfNeedMs) / bucketMs) * bucketMs
            );

            optimalTo = Math.min(
                originalRange.toMs,
                Math.ceil((optimalTo + needMs - halfNeedMs) / bucketMs) * bucketMs
            );
        }

        console.log('[calculateLoadInterval] Final interval:', {
            requested: {
                from: new Date(requestedFrom).toISOString(),
                to: new Date(requestedTo).toISOString(),
                buckets: requestSizeBuckets
            },
            optimal: {
                from: new Date(optimalFrom).toISOString(),
                to: new Date(optimalTo).toISOString(),
                buckets: Math.ceil((optimalTo - optimalFrom) / bucketMs)
            },
            expansion: (Math.ceil((optimalTo - optimalFrom) / bucketMs) / requestSizeBuckets).toFixed(2) + 'x'
        });

        return {
            fromMs: optimalFrom,
            toMs: optimalTo
        };
    }

    /**
     * Расширение до границ графика если близко
     */
    private static expandToGraphBoundaries(params: {
        readonly from: number;
        readonly to: number;
        readonly originalRange: OriginalRange;
        readonly bucketMs: BucketsMs;
        readonly requestSizeBuckets: number;
        readonly minBucketsThreshold: number;
        readonly proximityThreshold: number;
    }): { from: number; to: number } {
        const {
            from,
            to,
            originalRange,
            bucketMs,
            minBucketsThreshold,
            proximityThreshold
        } = params;

        let expandedFrom = from;
        let expandedTo = to;

        const requestSizeMs = to - from;

        // Левая граница
        const distanceToStart = from - originalRange.fromMs;
        const distanceToStartBuckets = Math.floor(distanceToStart / bucketMs);
        const relativeDistanceStart = requestSizeMs > 0 ? distanceToStart / requestSizeMs : 0;

        if (
            distanceToStartBuckets <= minBucketsThreshold ||
            relativeDistanceStart <= proximityThreshold
        ) {
            expandedFrom = Math.floor(originalRange.fromMs / bucketMs) * bucketMs;
            console.log('[expandToGraphBoundaries] Extended to graph start:', {
                distanceBuckets: distanceToStartBuckets,
                relativeDistance: (relativeDistanceStart * 100).toFixed(1) + '%'
            });
        }

        // Правая граница
        const distanceToEnd = originalRange.toMs - to;
        const distanceToEndBuckets = Math.floor(distanceToEnd / bucketMs);
        const relativeDistanceEnd = requestSizeMs > 0 ? distanceToEnd / requestSizeMs : 0;

        if (
            distanceToEndBuckets <= minBucketsThreshold ||
            relativeDistanceEnd <= proximityThreshold
        ) {
            expandedTo = Math.ceil(originalRange.toMs / bucketMs) * bucketMs;
            console.log('[expandToGraphBoundaries] Extended to graph end:', {
                distanceBuckets: distanceToEndBuckets,
                relativeDistance: (relativeDistanceEnd * 100).toFixed(1) + '%'
            });
        }

        return { from: expandedFrom, to: expandedTo };
    }

    /**
     * Расширение до соседних тайлов если близко
     */
    private static expandToNeighborTiles(params: {
        readonly tiles: readonly SeriesTile[];
        readonly from: number;
        readonly to: number;
        readonly bucketMs: BucketsMs;
        readonly requestSizeBuckets: number;
        readonly minBucketsThreshold: number;
        readonly proximityThreshold: number;
    }): { from: number; to: number } {
        const {
            tiles,
            from,
            to,
            bucketMs,
            minBucketsThreshold,
            proximityThreshold
        } = params;

        let expandedFrom = from;
        let expandedTo = to;

        const activeTiles = tiles
            .filter(t => t.status === 'ready' || t.status === 'loading')
            .sort((a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs);

        const requestSizeMs = to - from;

        // Ищем ближайший тайл слева
        const leftTiles = activeTiles.filter(t => t.coverageInterval.toMs <= from);
        if (leftTiles.length > 0) {
            const nearestLeft = leftTiles[leftTiles.length - 1]!;
            const gap = from - nearestLeft.coverageInterval.toMs;
            const gapBuckets = Math.floor(gap / bucketMs);
            const relativeGap = requestSizeMs > 0 ? gap / requestSizeMs : 0;

            if (
                gapBuckets <= minBucketsThreshold ||
                relativeGap <= proximityThreshold
            ) {
                expandedFrom = nearestLeft.coverageInterval.toMs;
                console.log('[expandToNeighborTiles] Extended to left tile:', {
                    gapBuckets,
                    relativeGap: (relativeGap * 100).toFixed(1) + '%'
                });
            }
        }

        // Ищем ближайший тайл справа
        const rightTiles = activeTiles.filter(t => t.coverageInterval.fromMs >= to);
        if (rightTiles.length > 0) {
            const nearestRight = rightTiles[0]!;
            const gap = nearestRight.coverageInterval.fromMs - to;
            const gapBuckets = Math.floor(gap / bucketMs);
            const relativeGap = requestSizeMs > 0 ? gap / requestSizeMs : 0;

            if (
                gapBuckets <= minBucketsThreshold ||
                relativeGap <= proximityThreshold
            ) {
                expandedTo = nearestRight.coverageInterval.fromMs;
                console.log('[expandToNeighborTiles] Extended to right tile:', {
                    gapBuckets,
                    relativeGap: (relativeGap * 100).toFixed(1) + '%'
                });
            }
        }

        return { from: expandedFrom, to: expandedTo };
    }

}



