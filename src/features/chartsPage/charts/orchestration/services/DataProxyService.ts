// orchestration/services/DataProxyService.ts

import type {
    SeriesTile,
    CoverageResult,
    BucketsMs,
    Gap, DataQuality
} from '@chartsPage/charts/core/store/types/chart.types';
import type {SeriesBinDto} from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";

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
     * Вычислить покрытие тайлов для диапазона
     */
    static calculateCoverage(
        tiles: readonly SeriesTile[],
        targetFromMs: number,
        targetToMs: number
    ): CoverageResult {
        const readyTiles = tiles.filter(t => t.status === 'ready');

        if (readyTiles.length === 0) {
            return {
                coverage: 0,
                gaps: [{ from: targetFromMs, to: targetToMs }],
                coveredRanges: []
            };
        }

        const sorted = [...readyTiles].sort(
            (a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs
        );

        const coveredRanges: Array<{ from: number; to: number }> = [];
        const gaps: Gap[] = [];
        let currentCovered = targetFromMs;

        for (const tile of sorted) {
            const tileFrom = Math.max(tile.coverageInterval.fromMs, targetFromMs);
            const tileTo = Math.min(tile.coverageInterval.toMs, targetToMs);

            if (tileTo <= tileFrom || tileFrom >= targetToMs) {
                continue;
            }

            if (tileFrom > currentCovered) {
                gaps.push({ from: currentCovered, to: tileFrom });
            }

            coveredRanges.push({ from: tileFrom, to: tileTo });
            currentCovered = Math.max(currentCovered, tileTo);
        }

        if (currentCovered < targetToMs) {
            gaps.push({ from: currentCovered, to: targetToMs });
        }

        const totalRangeMs = targetToMs - targetFromMs;
        const coveredMs = coveredRanges.reduce(
            (sum, range) => sum + (range.to - range.from),
            0
        );

        return {
            coverage: totalRangeMs > 0 ? (coveredMs / totalRangeMs) * 100 : 0,
            gaps,
            coveredRanges
        };
    }

    /**
     *  ИСПРАВЛЕНО: Убрана дедупликация
     *
     * Объединить bins из тайлов БЕЗ дедупликации.
     * Если сервер вернул дубликаты — это проблема сервера или логики загрузки,
     * но НЕ задача клиента их фильтровать.
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
            totalBins: allBins.length
        });

        return allBins;

        // ❌ ЗАКОММЕНТИРОВАНО: дедупликация
        // const deduped: SeriesBinDto[] = [];
        // let lastTime = -1;
        //
        // for (const bin of allBins) {
        //     const time = bin.t.getTime();
        //     if (time !== lastTime) {
        //         deduped.push(bin);
        //         lastTime = time;
        //     }
        // }
        //
        // return deduped;
    }

    /**
     *  ОСТАВЛЕНО: Фильтрация по range нужна для селекторов
     *
     * Но добавлено логирование для диагностики
     */
    static filterBinsByRange(
        bins: readonly SeriesBinDto[],
        fromMs: number,
        toMs: number
    ): readonly SeriesBinDto[] {
        const filtered = bins.filter(bin => {
            const t = bin.t.getTime();
            return t >= fromMs && t <= toMs;
        });

        const filteredOut = bins.length - filtered.length;
        if (filteredOut > 0) {
            console.log('[DataProxyService.filterBinsByRange] Filtered out bins outside range:', {
                total: bins.length,
                kept: filtered.length,
                removed: filteredOut,
                range: {
                    from: new Date(fromMs).toISOString(),
                    to: new Date(toMs).toISOString()
                }
            });
        }

        return filtered;
    }

    static selectOptimalDataWithoutRange(params: {
        targetBucketMs: BucketsMs;
        seriesLevels: Record<BucketsMs, SeriesTile[]>;
        availableBuckets: readonly BucketsMs[];
    }): OptimalDataResult {
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

        return this.calculateCoverage(readyTiles, minMs, maxMs).coverage;
    }

    /**
     *  ИСПРАВЛЕНО: Убрана дедупликация
     */
    private static mergeTileBins(tiles: readonly SeriesTile[]): readonly SeriesBinDto[] {
        const allBins: SeriesBinDto[] = [];

        for (const tile of tiles) {
            if (tile.status === 'ready') {
                allBins.push(...tile.bins);
            }
        }

        // Только сортировка
        allBins.sort((a, b) => a.t.getTime() - b.t.getTime());

        return allBins;

        // ❌ ЗАКОММЕНТИРОВАНО: дедупликация
        // const deduped: SeriesBinDto[] = [];
        // let lastTime = -1;
        //
        // for (const bin of allBins) {
        //     const time = bin.t.getTime();
        //     if (time !== lastTime) {
        //         deduped.push(bin);
        //         lastTime = time;
        //     }
        // }
        //
        // return deduped;
    }

    static selectOptimalData(params: {
        readonly targetBucketMs: BucketsMs;
        readonly targetFromMs: number;
        readonly targetToMs: number;
        readonly seriesLevels: Record<BucketsMs, SeriesTile[]>;
        readonly availableBuckets: readonly BucketsMs[];
    }): OptimalDataResult {
        const { targetBucketMs, targetFromMs, targetToMs, seriesLevels, availableBuckets } = params;

        const targetTiles = seriesLevels[targetBucketMs];
        if (targetTiles && targetTiles.length > 0) {
            const coverage = this.calculateCoverage(targetTiles, targetFromMs, targetToMs);

            if (coverage.coverage >= 95) {
                const bins = this.mergeBins(targetTiles);
                const filtered = this.filterBinsByRange(bins, targetFromMs, targetToMs);

                return {
                    data: filtered,
                    quality: 'exact',
                    coverage: coverage.coverage,
                    sourceBucketMs: targetBucketMs,
                    isStale: false,
                    gaps: coverage.gaps
                };
            }
        }

        const sortedByDistance = [...availableBuckets].sort((a, b) => {
            const diffA = Math.abs(a - targetBucketMs);
            const diffB = Math.abs(b - targetBucketMs);
            return diffA - diffB;
        });

        for (const bucketMs of sortedByDistance) {
            if (bucketMs === targetBucketMs) continue;

            const tiles = seriesLevels[bucketMs];
            if (!tiles || tiles.length === 0) continue;

            const coverage = this.calculateCoverage(tiles, targetFromMs, targetToMs);

            if (coverage.coverage >= 80) {
                const bins = this.mergeBins(tiles);
                const filtered = this.filterBinsByRange(bins, targetFromMs, targetToMs);

                const quality: DataQuality =
                    bucketMs < targetBucketMs ? 'upsampled' : 'downsampled';

                return {
                    data: filtered,
                    quality,
                    coverage: coverage.coverage,
                    sourceBucketMs: bucketMs,
                    isStale: true,
                    gaps: coverage.gaps
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
}