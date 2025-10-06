// orchestration/services/DataProcessingService.ts

import type { Dispatch } from '@reduxjs/toolkit';
import type {
    BucketsMs,
    CoverageInterval,
    SeriesTile,
    FieldName,
} from '@chartsPage/charts/core/store/types/chart.types';
import { replaceTiles } from '@chartsPage/charts/core/store/chartsSlice';
import { selectFieldView } from '@chartsPage/charts/core/store/selectors/base.selectors';
import type { RootState } from '@/store/store';
import type { MultiSeriesResponse } from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type { SeriesBinDto } from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";
import type { GetMultiSeriesRequest } from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest.ts";


export interface ProcessServerResponseParams {
    readonly response: MultiSeriesResponse;
    readonly bucketMs: BucketsMs;
    readonly requestedInterval: CoverageInterval;
    readonly tiles: readonly SeriesTile[];
    readonly field: FieldName;
    readonly dispatch: Dispatch;
}

// ============================================
// СЕРВИС
// ============================================

export class DataProcessingService {
    /**
     * ГЛАВНЫЙ МЕТОД: Анализ необходимости загрузки
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

        if (!fieldView) {
            console.warn('[DataProcessingService] No field view found');
            return false;
        }

        // 1. Выравниваем границы по bucket
        const alignedFrom = Math.floor(from / bucketMs) * bucketMs;
        const alignedTo = Math.ceil(to / bucketMs) * bucketMs;
        const originalRange = fieldView.originalRange;
        const tiles = fieldView.seriesLevel[bucketMs] ?? [];

        // 2. Проверяем текущее покрытие
        const coverage = this.calculateCoverageInBuckets(
            tiles,
            alignedFrom,
            alignedTo,
            bucketMs
        );

        // Если хватает хотя бы одного bucket - нужно грузить
        const requiredBuckets = Math.ceil((alignedTo - alignedFrom) / bucketMs);
        const missingBuckets = requiredBuckets - coverage.coveredBuckets;


        if (missingBuckets === 0) {
            console.log("Нет не прогруженных бакетов")
            return false;
        }

        // Оптимизируем интервал с учётом границ графика
        const optimalInterval = this.optimizeLoadInterval(
            tiles,
            alignedFrom,
            alignedTo,
            bucketMs,
            originalRange // передаём границы графика
        );

        if (!optimalInterval) {
            return false;
        }

        // 4. Проверяем loading tiles
        const hasLoadingCoverage = tiles.some(t =>
            t.status === 'loading' &&
            t.coverageInterval.fromMs <= optimalInterval.fromMs &&
            t.coverageInterval.toMs >= optimalInterval.toMs
        );

        if (hasLoadingCoverage) {
            console.log('[DataProcessingService] Already loading this interval');
            return false;
        }

        // 5. Формируем запрос
        const template = state.charts.template;
        if (!template) {
            console.error('[DataProcessingService] No template in state');
            return false;
        }

        const field = template.selectedFields.find(f => f.name === fieldName);
        if (!field) {
            console.error('[DataProcessingService] Field not found in template:', fieldName);
            return false;
        }

        const syncFields = state.charts.syncEnabled ? state.charts.syncFields : [];
        const allFields = [field, ...syncFields.filter(f => f.name !== fieldName)];

        const request: GetMultiSeriesRequest = {
            template: {
                ...template,
                selectedFields: allFields
            },
            from: new Date(optimalInterval.fromMs),
            to: new Date(optimalInterval.toMs),
            px,
            bucketMs
        };

        console.log('Загрузка оптимального диапазона', request.from?.toISOString());
        console.log('Загрузка оптимального диапазона', request.to?.toISOString());
        console.log('Загрузка оптимального диапазона', request.bucketMs);

        return request;
    }

    /**
     * Оптимизация интервала для соединения с соседними тайлами
     */
    private static optimizeLoadInterval(
        tiles: readonly SeriesTile[],
        alignedFrom: number,
        alignedTo: number,
        bucketMs: BucketsMs,
        originalRange?: { from: Date; to: Date }
    ): { fromMs: number; toMs: number } | null {

        const requestSizeBuckets = Math.ceil((alignedTo - alignedFrom) / bucketMs);
        const singleBucketThreshold = 3;
        const percentThreshold = 0.2;

        // Используем requestSizeBuckets для логирования
        console.log('[optimizeLoadInterval] Starting optimization:', {
            requestSizeBuckets,
            bucketMs,
            alignedRange: {
                from: new Date(alignedFrom).toISOString(),
                to: new Date(alignedTo).toISOString()
            }
        });

        const activeTiles = tiles
            .filter(t => t.status === 'ready' || t.status === 'loading')
            .sort((a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs);

        if (activeTiles.length === 0) {
            return { fromMs: alignedFrom, toMs: alignedTo };
        }

        let optimalFrom = alignedFrom;
        let optimalTo = alignedTo;

        const graphStart = originalRange?.from.getTime();
        const graphEnd = originalRange?.to.getTime();

        // === АНАЛИЗ ЛЕВОЙ ГРАНИЦЫ ===

        // Проверяем близость к началу графика
        if (graphStart !== undefined) {
            const distanceToGraphStart = alignedFrom - graphStart;
            const distanceInBuckets = Math.floor(distanceToGraphStart / bucketMs);

            // Используем requestSizeBuckets для определения относительного размера
            const relativeDistance = distanceToGraphStart / (alignedTo - alignedFrom);

            if (distanceInBuckets <= singleBucketThreshold || relativeDistance <= percentThreshold) {
                optimalFrom = Math.floor(graphStart / bucketMs) * bucketMs;
                console.log('[optimizeLoadInterval] Extending left to graph start:', {
                    distanceInBuckets,
                    relativeToRequest: (relativeDistance * 100).toFixed(1) + '%'
                });
            }
        }

        // Проверяем соседние тайлы
        if (optimalFrom === alignedFrom) {
            const tilesOnLeft = activeTiles.filter(t =>
                t.coverageInterval.toMs <= alignedFrom
            );

            if (tilesOnLeft.length > 0) {
                const nearestLeft = tilesOnLeft[tilesOnLeft.length - 1];
                const gapInBuckets = Math.floor(
                    (alignedFrom - nearestLeft.coverageInterval.toMs) / bucketMs
                );
                const gapPercent = (alignedFrom - nearestLeft.coverageInterval.toMs) /
                    (alignedTo - alignedFrom);

                // Логируем с использованием requestSizeBuckets
                console.log('[optimizeLoadInterval] Left neighbor analysis:', {
                    gapInBuckets,
                    gapPercent: (gapPercent * 100).toFixed(1) + '%',
                    requestSizeBuckets,
                    shouldMerge: gapInBuckets <= singleBucketThreshold || gapPercent <= percentThreshold
                });

                if (gapInBuckets <= singleBucketThreshold || gapPercent <= percentThreshold) {
                    optimalFrom = nearestLeft.coverageInterval.toMs;
                }
            }
        }

        // === АНАЛИЗ ПРАВОЙ ГРАНИЦЫ ===

        // Аналогично для правой границы
        if (graphEnd !== undefined) {
            const distanceToGraphEnd = graphEnd - alignedTo;
            const distanceInBuckets = Math.floor(distanceToGraphEnd / bucketMs);
            const relativeDistance = distanceToGraphEnd / (alignedTo - alignedFrom);

            if (distanceInBuckets <= singleBucketThreshold || relativeDistance <= percentThreshold) {
                optimalTo = Math.ceil(graphEnd / bucketMs) * bucketMs;
                console.log('[optimizeLoadInterval] Extending right to graph end:', {
                    distanceInBuckets,
                    relativeToRequest: (relativeDistance * 100).toFixed(1) + '%'
                });
            }
        }

        if (optimalTo === alignedTo) {
            const tilesOnRight = activeTiles.filter(t =>
                t.coverageInterval.fromMs >= alignedTo
            );

            if (tilesOnRight.length > 0) {
                const nearestRight = tilesOnRight[0];
                const gapInBuckets = Math.floor(
                    (nearestRight.coverageInterval.fromMs - alignedTo) / bucketMs
                );
                const gapPercent = (nearestRight.coverageInterval.fromMs - alignedTo) /
                    (alignedTo - alignedFrom);

                console.log('[optimizeLoadInterval] Right neighbor analysis:', {
                    gapInBuckets,
                    gapPercent: (gapPercent * 100).toFixed(1) + '%',
                    requestSizeBuckets,
                    shouldMerge: gapInBuckets <= singleBucketThreshold || gapPercent <= percentThreshold
                });

                if (gapInBuckets <= singleBucketThreshold || gapPercent <= percentThreshold) {
                    optimalTo = nearestRight.coverageInterval.fromMs;
                }
            }
        }

        // Финальная проверка
        if (optimalTo <= optimalFrom) {
            return null;
        }

        const hasFullCoverage = activeTiles.some(t =>
            t.status === 'ready' &&
            t.coverageInterval.fromMs <= optimalFrom &&
            t.coverageInterval.toMs >= optimalTo
        );

        if (hasFullCoverage) {
            return null;
        }

        // Финальный размер в buckets
        const optimizedSizeBuckets = Math.ceil((optimalTo - optimalFrom) / bucketMs);

        console.log('[optimizeLoadInterval] Final result:', {
            originalBuckets: requestSizeBuckets,
            optimizedBuckets: optimizedSizeBuckets,
            expansionFactor: (optimizedSizeBuckets / requestSizeBuckets).toFixed(2) + 'x'
        });

        return { fromMs: optimalFrom, toMs: optimalTo };
    }

    /**
     * Подсчёт покрытия в buckets
     */
    // DataProcessingService.ts - исправленный метод

    private static calculateCoverageInBuckets(
        tiles: readonly SeriesTile[],
        fromMs: number,
        toMs: number,
        bucketMs: BucketsMs
    ): { coveredBuckets: number; totalBuckets: number; percentage: number } {
        const totalBuckets = Math.ceil((toMs - fromMs) / bucketMs);

        // Проверяем покрытие через интервалы тайлов, а не через отдельные bins
        const coveredBucketsSet = new Set<number>();

        for (const tile of tiles) {
            if (tile.status !== 'ready') continue;

            // Проверяем пересечение интервала тайла с запрашиваемым диапазоном
            const tileStart = tile.coverageInterval.fromMs;
            const tileEnd = tile.coverageInterval.toMs;

            // Если тайл пересекается с запрашиваемым диапазоном
            if (tileEnd > fromMs && tileStart < toMs) {
                // Вычисляем какие buckets покрывает этот тайл
                const startBucket = Math.max(0, Math.floor((tileStart - fromMs) / bucketMs));
                const endBucket = Math.min(totalBuckets - 1, Math.ceil((tileEnd - fromMs) / bucketMs));

                // Если у тайла есть данные - считаем что он покрывает свой интервал
                if (tile.bins.length > 0) {
                    for (let i = startBucket; i <= endBucket; i++) {
                        coveredBucketsSet.add(i);
                    }
                }
            }
        }

        const coveredBuckets = coveredBucketsSet.size;
        const percentage = totalBuckets > 0 ? (coveredBuckets / totalBuckets) * 100 : 0;

        console.log('[calculateCoverageInBuckets] Coverage details:', {
            fromMs: new Date(fromMs).toISOString(),
            toMs: new Date(toMs).toISOString(),
            totalBuckets,
            coveredBuckets,
            percentage: percentage.toFixed(1) + '%',
            tilesChecked: tiles.filter(t => t.status === 'ready').length
        });

        return { coveredBuckets, totalBuckets, percentage };
    }

    /**
     * Подготовка loading tiles
     */
    static prepareLoadingTiles(params: {
        readonly field: FieldName;
        readonly bucketMs: BucketsMs;
        readonly loadingInterval: CoverageInterval;
        readonly requestId: string;
        readonly dispatch: Dispatch;
        readonly getState: () => RootState;
    }): void {
        const { field, bucketMs, loadingInterval, requestId, dispatch, getState } = params;

        const alignedInterval: CoverageInterval = {
            fromMs: Math.floor(loadingInterval.fromMs / bucketMs) * bucketMs,
            toMs: Math.ceil(loadingInterval.toMs / bucketMs) * bucketMs
        };

        const state = getState();
        const fieldView = selectFieldView(state, field);

        if (!fieldView) {
            console.error('[DataProcessingService] No field view for prepareLoadingTiles');
            return;
        }

        const tiles = fieldView.seriesLevel[bucketMs] ?? [];

        const hasLoadingTile = tiles.some(t =>
            t.status === 'loading' &&
            t.coverageInterval.fromMs === alignedInterval.fromMs &&
            t.coverageInterval.toMs === alignedInterval.toMs
        );

        if (hasLoadingTile) {
            return;
        }

        const updatedTiles = [...tiles, {
            coverageInterval: alignedInterval,
            bins: [],
            status: 'loading' as const,
            requestId
        }];

        updatedTiles.sort((a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs);

        dispatch(replaceTiles({ field, bucketMs, tiles: updatedTiles }));
    }

    /**
     * Обработка ответа от сервера
     */
    static processServerResponse(params: ProcessServerResponseParams): void {
        const { response, bucketMs, requestedInterval, tiles, field, dispatch } = params;

        const series = response.series?.find(s => s.field.name === field);

        // Логируем что получили
        console.log('[DataProcessingService] Processing response:', {
            field,
            requestedInterval: {
                from: new Date(requestedInterval.fromMs).toISOString(),
                to: new Date(requestedInterval.toMs).toISOString()
            },
            existingTiles: tiles.map(t => ({
                status: t.status,
                from: new Date(t.coverageInterval.fromMs).toISOString(),
                to: new Date(t.coverageInterval.toMs).toISOString(),
                bins: t.bins.length
            }))
        });

        if (!series || !series.bins || series.bins.length === 0) {
            // Заменяем loading на пустой ready
            const updatedTiles = tiles.filter(tile => {
                // Удаляем loading тайл который покрывает этот интервал
                if (tile.status === 'loading') {
                    const overlap = !(tile.coverageInterval.toMs <= requestedInterval.fromMs ||
                        tile.coverageInterval.fromMs >= requestedInterval.toMs);
                    return !overlap;
                }
                return true;
            });

            // Добавляем пустой ready тайл
            updatedTiles.push({
                coverageInterval: requestedInterval,
                bins: [],
                status: 'ready',
                loadedAt: Date.now()
            });

            updatedTiles.sort((a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs);
            dispatch(replaceTiles({ field, bucketMs, tiles: updatedTiles }));
            return;
        }

        // Фильтруем bins по интервалу
        const bins = this.convertBins(series.bins).filter(bin =>
            bin.t.getTime() >= requestedInterval.fromMs &&
            bin.t.getTime() <= requestedInterval.toMs
        );

        // ВАЖНО: Проверяем нет ли пересечений с ready тайлами
        const overlappingReady = tiles.filter(tile =>
            tile.status === 'ready' &&
            !(tile.coverageInterval.toMs <= requestedInterval.fromMs ||
                tile.coverageInterval.fromMs >= requestedInterval.toMs)
        );

        if (overlappingReady.length > 0) {
            console.warn('[DataProcessingService] Found overlapping ready tiles!', {
                requested: {
                    from: new Date(requestedInterval.fromMs).toISOString(),
                    to: new Date(requestedInterval.toMs).toISOString()
                },
                overlapping: overlappingReady.map(t => ({
                    from: new Date(t.coverageInterval.fromMs).toISOString(),
                    to: new Date(t.coverageInterval.toMs).toISOString(),
                    bins: t.bins.length
                }))
            });
        }

        // Удаляем ВСЕ loading тайлы которые пересекаются с новым
        const filteredTiles = tiles.filter(tile => {
            if (tile.status === 'loading') {
                const overlap = !(tile.coverageInterval.toMs <= requestedInterval.fromMs ||
                    tile.coverageInterval.fromMs >= requestedInterval.toMs);
                if (overlap) {
                    console.log('[DataProcessingService] Removing loading tile:', {
                        from: new Date(tile.coverageInterval.fromMs).toISOString(),
                        to: new Date(tile.coverageInterval.toMs).toISOString()
                    });
                    return false;
                }
            }
            return true;
        });

        // Добавляем новый ready тайл
        const newTile: SeriesTile = {
            coverageInterval: requestedInterval,
            bins,
            status: 'ready',
            loadedAt: Date.now()
        };

        const updatedTiles = [...filteredTiles, newTile];
        updatedTiles.sort((a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs);

        // Финальная проверка на дубликаты
        const intervals = updatedTiles.map(t =>
            `${new Date(t.coverageInterval.fromMs).toISOString()}_${new Date(t.coverageInterval.toMs).toISOString()}`
        );
        const uniqueIntervals = new Set(intervals);

        if (intervals.length !== uniqueIntervals.size) {
            console.error('[DataProcessingService] DUPLICATE TILES DETECTED!');
        }

        dispatch(replaceTiles({ field, bucketMs, tiles: updatedTiles }));

        console.log('[DataProcessingService] Response processed:', {
            field,
            bucketMs,
            binsReceived: bins.length,
            totalTiles: updatedTiles.length,
            readyTiles: updatedTiles.filter(t => t.status === 'ready').length
        });
    }

    /**
     * Конвертация bins с валидацией
     */
    private static convertBins(bins: readonly any[]): SeriesBinDto[] {
        const converted: SeriesBinDto[] = [];

        for (const bin of bins) {
            if (!bin) continue;

            const convertedBin: SeriesBinDto = {
                t: bin.t instanceof Date ? bin.t : new Date(bin.t),
                avg: bin.avg != null ? Number(bin.avg) : undefined,
                min: bin.min != null ? Number(bin.min) : undefined,
                max: bin.max != null ? Number(bin.max) : undefined,
                count: Number(bin.count) || 1
            };

            if (isNaN(convertedBin.t.getTime())) continue;

            if (convertedBin.avg === undefined &&
                convertedBin.min === undefined &&
                convertedBin.max === undefined) continue;

            converted.push(convertedBin);
        }

        return converted;
    }
}