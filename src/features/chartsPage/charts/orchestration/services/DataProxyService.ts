// orchestration/services/DataProxyService.ts

import type {
    SeriesTile,
    CoverageResult,
    BucketsMs,
    Gap, DataQuality, OriginalRange
} from '@chartsPage/charts/core/store/types/chart.types';
import type {SeriesBinDto} from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";
import {TileSystemCore} from "@chartsPage/charts/core/store/tile-system/TileSystemCore.ts";

export interface OptimalDataResult {
    readonly data: readonly SeriesBinDto[];
    readonly quality: DataQuality;
    readonly coverage: number;
    readonly sourceBucketMs: BucketsMs | undefined;
    readonly isStale: boolean;
    readonly gaps: readonly Gap[];
}

export class DataProxyService {

    /**
     * ✅ РЕФАКТОРИНГ: Используем TileSystemCore.findGaps
     */
    static calculateCoverage(
        tiles: readonly SeriesTile[],
        targetFromMs: number,
        targetToMs: number
    ): CoverageResult {
        const originalRange: OriginalRange = {
            fromMs: targetFromMs,
            toMs: targetToMs
        };

        const gapsResult = TileSystemCore.findGaps(
            originalRange,
            tiles,
            { fromMs: targetFromMs, toMs: targetToMs }
        );

        return {
            coverage: gapsResult.coverage,
            gaps: gapsResult.gaps.map(g => ({ from: g.fromMs, to: g.toMs })),
            coveredRanges: [] // TileSystemCore не возвращает coveredRanges, но они нам не нужны
        };
    }

    /**
     * ✅ НОВЫЙ МЕТОД: Вставить null значения в места gaps
     *
     * Это заставит ECharts прерывать линию в незагруженных областях
     */
    static insertNullsForGaps(
        bins: readonly SeriesBinDto[],
        gaps: readonly Gap[],
        bucketMs: BucketsMs
    ): readonly SeriesBinDto[] {
        if (bins.length === 0 || gaps.length === 0) {
            return bins;
        }

        const result: SeriesBinDto[] = [];
        let binIndex = 0;

        console.log('[insertNullsForGaps] Inserting nulls:', {
            binsCount: bins.length,
            gapsCount: gaps.length,
            bucketMs
        });

        // Сортируем gaps по времени
        const sortedGaps = [...gaps].sort((a, b) => a.from - b.to);

        for (const gap of sortedGaps) {
            // Добавляем все bins до начала gap
            while (binIndex < bins.length) {
                const bin = bins[binIndex]!;
                const binTime = bin.t.getTime();

                if (binTime >= gap.from) {
                    break;
                }

                result.push(bin);
                binIndex++;
            }

            // ✅ Вставляем null-bin в начале gap
            result.push({
                t: new Date(gap.from),
                avg: null as any,
                min: null as any,
                max: null as any,
                count: 0
            });

            // ✅ Вставляем null-bin в конце gap
            result.push({
                t: new Date(gap.to),
                avg: null as any,
                min: null as any,
                max: null as any,
                count: 0
            });

            console.log('[insertNullsForGaps] Added null for gap:', {
                from: new Date(gap.from).toISOString(),
                to: new Date(gap.to).toISOString()
            });
        }

        // Добавляем оставшиеся bins после всех gaps
        while (binIndex < bins.length) {
            result.push(bins[binIndex]!);
            binIndex++;
        }

        console.log('[insertNullsForGaps] Result:', {
            originalBins: bins.length,
            resultBins: result.length,
            nullsAdded: result.length - bins.length
        });

        return result;
    }

    /**
     * Объединить bins из тайлов БЕЗ дедупликации
     */
    static mergeBins(tiles: readonly SeriesTile[]): readonly SeriesBinDto[] {
        const allBins: SeriesBinDto[] = [];

        for (const tile of tiles) {
            if (tile.status === 'ready') {
                allBins.push(...tile.bins);
            }
        }

        // Только сортировка, БЕЗ дедупликации
        allBins.sort((a, b) => a.t.getTime() - b.t.getTime());

        console.log('[DataProxyService.mergeBins] Merged bins from tiles:', {
            tilesCount: tiles.filter(t => t.status === 'ready').length,
            totalBins: allBins.length,
            range: allBins.length > 0 ? {
                from: new Date(allBins[0]!.t).toISOString(),
                to: new Date(allBins[allBins.length - 1]!.t).toISOString()
            } : null
        });

        return allBins;
    }

    /**
     * ✅ РЕФАКТОРИНГ: Используем TileSystemCore для всех вычислений
     *
     * Возвращает ВСЕ bins с текущего bucket уровня + вставленные null для gaps.
     */
    static selectOptimalData(params: {
        readonly targetBucketMs: BucketsMs;
        readonly targetFromMs: number;
        readonly targetToMs: number;
        readonly originalRange: OriginalRange;
        readonly seriesLevels: Record<BucketsMs, SeriesTile[]>;
        readonly availableBuckets: readonly BucketsMs[];
    }): OptimalDataResult {
        const { targetBucketMs, targetFromMs, targetToMs, originalRange, seriesLevels, availableBuckets } = params;

        // Пробуем текущий bucket
        const currentTiles = seriesLevels[targetBucketMs];
        if (currentTiles && currentTiles.length > 0) {
            // ✅ Используем TileSystemCore.findGaps для видимой области
            const visibleGapsResult = TileSystemCore.findGaps(
                originalRange,
                currentTiles,
                { fromMs: targetFromMs, toMs: targetToMs }
            );

            // ✅ Получаем ВСЕ bins с текущего уровня
            const allBins = this.mergeBins(currentTiles);

            // ✅ Используем TileSystemCore.findGaps для ВСЕГО диапазона данных
            // Находим минимальный и максимальный диапазон среди тайлов
            const readyTiles = currentTiles.filter(t => t.status === 'ready');

            let dataRangeFrom = Number.MAX_VALUE;
            let dataRangeTo = Number.MIN_VALUE;

            for (const tile of readyTiles) {
                dataRangeFrom = Math.min(dataRangeFrom, tile.coverageInterval.fromMs);
                dataRangeTo = Math.max(dataRangeTo, tile.coverageInterval.toMs);
            }

            // ✅ Находим gaps между ВСЕМИ загруженными тайлами (не только в видимой области)
            const allDataGapsResult = dataRangeFrom < dataRangeTo
                ? TileSystemCore.findGaps(
                    originalRange,
                    currentTiles,
                    { fromMs: dataRangeFrom, toMs: dataRangeTo }
                )
                : { gaps: [], coverage: 0, hasFull: false };

            console.log('[selectOptimalData] Current bucket analysis:', {
                bucket: targetBucketMs,
                visibleRange: {
                    from: new Date(targetFromMs).toISOString(),
                    to: new Date(targetToMs).toISOString()
                },
                visibleCoverage: visibleGapsResult.coverage.toFixed(1) + '%',
                visibleGaps: visibleGapsResult.gaps.length,
                dataRange: dataRangeFrom < dataRangeTo ? {
                    from: new Date(dataRangeFrom).toISOString(),
                    to: new Date(dataRangeTo).toISOString()
                } : null,
                allDataGaps: allDataGapsResult.gaps.length,
                allTiles: currentTiles.length,
                readyTiles: readyTiles.length,
                totalBins: allBins.length
            });

            if (allBins.length > 0) {
                // ✅ Вставляем null значения в места gaps между тайлами
                const gapsForNulls = allDataGapsResult.gaps.map(g => ({
                    from: g.fromMs,
                    to: g.toMs
                }));

                const binsWithNulls = this.insertNullsForGaps(
                    allBins,
                    gapsForNulls,
                    targetBucketMs
                );

                // ✅ Возвращаем gaps для видимой области (для красных зон)
                const visibleGaps = visibleGapsResult.gaps.map(g => ({
                    from: g.fromMs,
                    to: g.toMs
                }));

                return {
                    data: binsWithNulls,
                    quality: 'exact',
                    coverage: visibleGapsResult.coverage,
                    sourceBucketMs: targetBucketMs,
                    isStale: false,
                    gaps: visibleGaps
                };
            }
        }

        // Ищем fallback bucket
        const sortedBuckets = [...availableBuckets].sort((a, b) => {
            const diffA = Math.abs(a - targetBucketMs);
            const diffB = Math.abs(b - targetBucketMs);
            return diffA - diffB;
        });

        for (const bucketMs of sortedBuckets) {
            if (bucketMs === targetBucketMs) continue;

            const tiles = seriesLevels[bucketMs];
            if (!tiles || tiles.length === 0) continue;

            // ✅ Используем TileSystemCore.findGaps
            const coverageResult = TileSystemCore.findGaps(
                originalRange,
                tiles,
                { fromMs: targetFromMs, toMs: targetToMs }
            );

            console.log('[selectOptimalData] Checking fallback bucket:', {
                bucket: bucketMs,
                coverage: coverageResult.coverage.toFixed(1) + '%',
                gaps: coverageResult.gaps.length
            });

            if (coverageResult.coverage >= 80) {
                const allBins = this.mergeBins(tiles);
                const readyTiles = tiles.filter(t => t.status === 'ready');

                // Находим диапазон данных
                let dataRangeFrom = Number.MAX_VALUE;
                let dataRangeTo = Number.MIN_VALUE;

                for (const tile of readyTiles) {
                    dataRangeFrom = Math.min(dataRangeFrom, tile.coverageInterval.fromMs);
                    dataRangeTo = Math.max(dataRangeTo, tile.coverageInterval.toMs);
                }

                const allDataGapsResult = dataRangeFrom < dataRangeTo
                    ? TileSystemCore.findGaps(
                        originalRange,
                        tiles,
                        { fromMs: dataRangeFrom, toMs: dataRangeTo }
                    )
                    : { gaps: [], coverage: 0, hasFull: false };

                const gapsForNulls = allDataGapsResult.gaps.map(g => ({
                    from: g.fromMs,
                    to: g.toMs
                }));

                const binsWithNulls = this.insertNullsForGaps(allBins, gapsForNulls, bucketMs);
                const quality: DataQuality = bucketMs < targetBucketMs ? 'upsampled' : 'downsampled';

                const visibleGaps = coverageResult.gaps.map(g => ({
                    from: g.fromMs,
                    to: g.toMs
                }));

                return {
                    data: binsWithNulls,
                    quality,
                    coverage: coverageResult.coverage,
                    sourceBucketMs: bucketMs,
                    isStale: true,
                    gaps: visibleGaps
                };
            }
        }

        // Нет данных
        return {
            data: [],
            quality: 'none',
            coverage: 0,
            sourceBucketMs: undefined,
            isStale: false,
            gaps: [{ from: targetFromMs, to: targetToMs }]
        };
    }

    /**
     * ⚠️ DEPRECATED
     */
    static selectOptimalDataWithoutRange(params: {
        targetBucketMs: BucketsMs;
        seriesLevels: Record<BucketsMs, SeriesTile[]>;
        availableBuckets: readonly BucketsMs[];
    }): OptimalDataResult {
        console.warn('[selectOptimalDataWithoutRange] DEPRECATED: Use selectOptimalData instead');

        const { targetBucketMs, seriesLevels, availableBuckets } = params;

        const currentTiles = seriesLevels[targetBucketMs];
        if (currentTiles && currentTiles.length > 0) {
            const allBins = this.mergeTileBins(currentTiles);
            const coverage = this.calculateTilesCoverage(currentTiles);

            if (coverage >= 95) {
                return {
                    data: allBins,
                    quality: 'exact',
                    coverage,
                    sourceBucketMs: targetBucketMs,
                    isStale: false,
                    gaps: []
                };
            }
        }

        const sortedBuckets = [...availableBuckets].sort((a, b) => {
            const diffA = Math.abs(a - targetBucketMs);
            const diffB = Math.abs(b - targetBucketMs);
            return diffA - diffB;
        });

        for (const bucketMs of sortedBuckets) {
            if (bucketMs === targetBucketMs) continue;

            const tiles = seriesLevels[bucketMs];
            if (!tiles || tiles.length === 0) continue;

            const coverage = this.calculateTilesCoverage(tiles);

            if (coverage >= 80) {
                const allBins = this.mergeTileBins(tiles);
                const quality: DataQuality = bucketMs < targetBucketMs ? 'upsampled' : 'downsampled';

                return {
                    data: allBins,
                    quality,
                    coverage,
                    sourceBucketMs: bucketMs,
                    isStale: true,
                    gaps: []
                };
            }
        }

        return {
            data: [],
            quality: 'none',
            coverage: 0,
            sourceBucketMs: undefined,
            isStale: false,
            gaps: []
        };
    }

    /**
     * ✅ РЕФАКТОРИНГ: Используем TileSystemCore.getStats
     */
    private static calculateTilesCoverage(tiles: readonly SeriesTile[]): number {
        const readyTiles = tiles.filter(t => t.status === 'ready');
        if (readyTiles.length === 0) return 0;

        let minMs = Number.MAX_VALUE;
        let maxMs = Number.MIN_VALUE;

        for (const tile of readyTiles) {
            minMs = Math.min(minMs, tile.coverageInterval.fromMs);
            maxMs = Math.max(maxMs, tile.coverageInterval.toMs);
        }

        if (minMs >= maxMs) return 0;

        const originalRange: OriginalRange = { fromMs: minMs, toMs: maxMs };
        const gapsResult = TileSystemCore.findGaps(originalRange, tiles);

        return gapsResult.coverage;
    }

    private static mergeTileBins(tiles: readonly SeriesTile[]): readonly SeriesBinDto[] {
        const allBins: SeriesBinDto[] = [];

        for (const tile of tiles) {
            if (tile.status === 'ready') {
                allBins.push(...tile.bins);
            }
        }

        allBins.sort((a, b) => a.t.getTime() - b.t.getTime());

        return allBins;
    }
}