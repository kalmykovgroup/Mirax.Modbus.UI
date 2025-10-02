/*
// src/charts/store/DataProxyService.ts

import type { SeriesBinDto } from '@chartsPage/template/shared/contracts/chart/Dtos/SeriesBinDto';
import type { BucketsMs, SeriesTile } from './chartsSlice';

export type DataQuality = 'exact' | 'upsampled' | 'downsampled' | 'interpolated' | 'none';

export interface ProxyDataResult {
    data: SeriesBinDto[];
    sourceBucketMs: BucketsMs;
    quality: DataQuality;
    coverage: number;
    isStale: boolean;
}

export interface CoverageCheckResult {
    hasSufficientCoverage: boolean;
    coveragePercent: number;
    gaps: Array<{ fromMs: number; toMs: number }>;
    quality: DataQuality;
    message: string;
}

export interface TileToLoad {
    fromMs: number;
    toMs: number;
    reason: 'gap' | 'prefetch-left' | 'prefetch-right';
    priority: 'high' | 'normal' | 'low';
}

export interface PanLoadingStrategy {
    needsLoading: boolean;
    tilesToLoad: TileToLoad[];
    direction: 'left' | 'right' | 'none';
}

export interface DataRequest {
    bucketMs: BucketsMs;
    from: Date;
    to: Date;
    minCoveragePercent?: number;
}


export class DataProxyService {
    private static instance: DataProxyService;

    // Настройки покрытия
    private static readonly DEFAULT_MIN_COVERAGE = 95; // 95% минимум для exact данных
    private static readonly STALE_MIN_COVERAGE = 80;   // 80% минимум для stale данных

    public static getInstance(): DataProxyService {
        if (!DataProxyService.instance) {
            DataProxyService.instance = new DataProxyService();
        }
        return DataProxyService.instance;
    }


    // DataProxyService.ts:64 (заменить метод)

    public determineTilesForPan(
        seriesLevel: Record<BucketsMs, SeriesTile[]>,
        currentBucketMs: BucketsMs,
        visibleRange: { from: Date; to: Date },
        previousRange?: { from: Date; to: Date } | undefined,
        prefetchMargin: number = 0.3
    ): PanLoadingStrategy {
        const rangeMs = {
            from: visibleRange.from.getTime(),
            to: visibleRange.to.getTime()
        };

        const tiles = seriesLevel[currentBucketMs] || [];
        const readyAndLoadingTiles = tiles.filter(t => t.status === 'ready' || t.status === 'loading');

        // 1. Определяем направление движения
        let direction: 'left' | 'right' | 'none' = 'none';
        if (previousRange) {
            const prevFrom = previousRange.from.getTime();
            const currFrom = rangeMs.from;

            if (currFrom < prevFrom) {
                direction = 'left';
            } else if (currFrom > prevFrom) {
                direction = 'right';
            }
        }

        // 2. Проверяем покрытие видимого диапазона
        const coverageCheck = this.checkExactLevelCoveragePublic(
            tiles.filter(t => t.status === 'ready'),
            rangeMs,
            90
        );

        const tilesToLoad: TileToLoad[] = [];

        // 3. Заполняем gaps в видимой области
        if (!coverageCheck.hasSufficientCoverage) {
            const { gaps } = this.calculateCoverageAndGaps(
                tiles.filter(t => t.status === 'ready'),
                rangeMs
            );

            // ИСПРАВЛЕНИЕ: Убираем gaps которые уже загружаются
            const actualGaps = this.removeLoadingGaps(gaps, tiles);

            actualGaps.forEach(gap => {
                tilesToLoad.push({
                    fromMs: gap.fromMs,
                    toMs: gap.toMs,
                    reason: 'gap',
                    priority: 'high'
                });
            });
        }

        // 4. Предзагрузка в направлении движения
        if (direction !== 'none') {
            const visibleSpan = rangeMs.to - rangeMs.from;
            const prefetchSize = Math.floor(visibleSpan * prefetchMargin);

            if (direction === 'left') {
                const prefetchFrom = rangeMs.from - prefetchSize;
                const prefetchTo = rangeMs.from;

                // ИСПРАВЛЕНИЕ: Проверяем что prefetch не перекрывается с существующими tiles
                const needsPrefetch = this.checkNeedsPrefetch(
                    readyAndLoadingTiles,
                    { from: prefetchFrom, to: prefetchTo },
                    50
                );

                if (needsPrefetch.needed) {
                    tilesToLoad.push({
                        fromMs: needsPrefetch.adjustedFrom,
                        toMs: needsPrefetch.adjustedTo,
                        reason: 'prefetch-left',
                        priority: 'normal'
                    });
                }
            } else if (direction === 'right') {
                const prefetchFrom = rangeMs.to;
                const prefetchTo = rangeMs.to + prefetchSize;

                const needsPrefetch = this.checkNeedsPrefetch(
                    readyAndLoadingTiles,
                    { from: prefetchFrom, to: prefetchTo },
                    50
                );

                if (needsPrefetch.needed) {
                    tilesToLoad.push({
                        fromMs: needsPrefetch.adjustedFrom,
                        toMs: needsPrefetch.adjustedTo,
                        reason: 'prefetch-right',
                        priority: 'normal'
                    });
                }
            }
        }

        return {
            needsLoading: tilesToLoad.length > 0,
            tilesToLoad,
            direction
        };
    }

    /!**
     * Убирает gaps которые уже загружаются
     *!/
    private removeLoadingGaps(
        gaps: Array<{ fromMs: number; toMs: number }>,
        tiles: SeriesTile[]
    ): Array<{ fromMs: number; toMs: number }> {
        const loadingTiles = tiles.filter(t => t.status === 'loading');
        if (loadingTiles.length === 0) return gaps;

        return gaps.filter(gap => {
            // Проверяем что gap не перекрывается с loading tiles
            const hasLoadingOverlap = loadingTiles.some(tile => {
                return !(gap.toMs <= tile.coverageInterval.fromMs ||
                    gap.fromMs >= tile.coverageInterval.toMs);
            });
            return !hasLoadingOverlap;
        });
    }

    /!**
     * Проверяет нужна ли предзагрузка и корректирует диапазон
     *!/
    private checkNeedsPrefetch(
        tiles: SeriesTile[],
        prefetchRange: { from: number; to: number },
        minCoveragePercent: number
    ): { needed: boolean; adjustedFrom: number; adjustedTo: number } {
        if (tiles.length === 0) {
            return {
                needed: true,
                adjustedFrom: prefetchRange.from,
                adjustedTo: prefetchRange.to
            };
        }

        // Вычисляем покрытие prefetch-области
        const { coverage, gaps } = this.calculateCoverageAndGaps(tiles, prefetchRange);

        // Если покрытие достаточное - не нужна загрузка
        if (coverage >= minCoveragePercent) {
            return { needed: false, adjustedFrom: 0, adjustedTo: 0 };
        }

        // Если есть gaps - загружаем только непокрытую часть
        if (gaps.length > 0) {
            // Берём самый большой gap
            const largestGap = gaps.reduce((max, gap) => {
                const gapSize = gap.toMs - gap.fromMs;
                const maxSize = max.toMs - max.fromMs;
                return gapSize > maxSize ? gap : max;
            });

            return {
                needed: true,
                adjustedFrom: largestGap.fromMs,
                adjustedTo: largestGap.toMs
            };
        }

        return {
            needed: true,
            adjustedFrom: prefetchRange.from,
            adjustedTo: prefetchRange.to
        };
    }

    /!**
     * Главный метод - проверяет, нужна ли загрузка данных
     *!/
    public checkDataNeedsLoading(
        seriesLevels: Record<BucketsMs, SeriesTile[]>,
        request: DataRequest
    ): CoverageCheckResult {
        const rangeMs = {
            from: request.from.getTime(),
            to: request.to.getTime()
        };

        const minCoverage = request.minCoveragePercent ?? DataProxyService.DEFAULT_MIN_COVERAGE;

        // 1. Проверяем точные данные на запрошенном уровне
        const exactCheck = this.checkExactLevelCoverage(
            seriesLevels,
            request.bucketMs,
            rangeMs,
            minCoverage
        );

        if (exactCheck.hasSufficientCoverage) {
            return exactCheck;
        }

        // 2. Проверяем, можем ли использовать другие уровни (stale данные)
        const alternativeCheck = this.checkAlternativeLevelsCoverage(
            seriesLevels,
            request.bucketMs,
            rangeMs,
            DataProxyService.STALE_MIN_COVERAGE
        );

        if (alternativeCheck.hasSufficientCoverage) {
            return {
                ...alternativeCheck,
                message: `Using ${alternativeCheck.quality} data from different level`
            };
        }

        // 3. Недостаточно данных - нужна загрузка
        return {
            hasSufficientCoverage: false,
            coveragePercent: Math.max(exactCheck.coveragePercent, alternativeCheck.coveragePercent),
            gaps: exactCheck.gaps,
            quality: 'none',
            message: `Insufficient coverage: ${exactCheck.coveragePercent.toFixed(1)}% exact, ${alternativeCheck.coveragePercent.toFixed(1)}% alternative`
        };
    }


    /!**
     * Проверяет покрытие на точном уровне
     *!/
    public  checkExactLevelCoverage(
        seriesLevels: Record<BucketsMs, SeriesTile[]>,
        targetBucketMs: BucketsMs,
        rangeMs: { from: number; to: number },
        minCoveragePercent: number
    ): CoverageCheckResult {
        const tiles = seriesLevels[targetBucketMs] || [];
        const readyTiles = tiles.filter(t => t.status === 'ready');

        if (readyTiles.length === 0) {
            return {
                hasSufficientCoverage: false,
                coveragePercent: 0,
                gaps: [{ fromMs: rangeMs.from, toMs: rangeMs.to }],
                quality: 'none',
                message: 'No shared on target level'
            };
        }

        // Вычисляем покрытие и gaps
        const { coverage, gaps } = this.calculateCoverageAndGaps(readyTiles, rangeMs);

        return {
            hasSufficientCoverage: coverage >= minCoveragePercent,
            coveragePercent: coverage,
            gaps,
            quality: 'exact',
            message: coverage >= minCoveragePercent
                ? 'Sufficient exact shared available'
                : `Only ${coverage.toFixed(1)}% coverage (need ${minCoveragePercent}%)`
        };
    }

    /!**
     * Проверяет возможность использования альтернативных уровней
     *!/
    private checkAlternativeLevelsCoverage(
        seriesLevels: Record<BucketsMs, SeriesTile[]>,
        targetBucketMs: BucketsMs,
        rangeMs: { from: number; to: number },
        minCoveragePercent: number
    ): CoverageCheckResult {
        const availableLevels = Object.keys(seriesLevels)
            .map(Number)
            .filter(bucket => {
                const tiles = seriesLevels[bucket] || [];
                return tiles.some(t => t.status === 'ready' && t.bins.length > 0);
            })
            .sort((a, b) => Math.abs(a - targetBucketMs) - Math.abs(b - targetBucketMs));

        if (availableLevels.length === 0) {
            return {
                hasSufficientCoverage: false,
                coveragePercent: 0,
                gaps: [{ fromMs: rangeMs.from, toMs: rangeMs.to }],
                quality: 'none',
                message: 'No alternative levels available'
            };
        }

        // Проверяем ближайший уровень
        const nearestBucket = availableLevels[0]!;
        const tiles = seriesLevels[nearestBucket] || [];
        const readyTiles = tiles.filter(t => t.status === 'ready');

        const { coverage, gaps } = this.calculateCoverageAndGaps(readyTiles, rangeMs);
        const ratio = targetBucketMs / nearestBucket;

        let quality: DataQuality;
        if (ratio > 1.5) {
            quality = 'downsampled';
        } else if (ratio < 0.66) {
            quality = 'upsampled';
        } else {
            quality = 'interpolated';
        }

        return {
            hasSufficientCoverage: coverage >= minCoveragePercent,
            coveragePercent: coverage,
            gaps,
            quality,
            message: `Alternative level ${nearestBucket}ms has ${coverage.toFixed(1)}% coverage`
        };
    }

    /!**
     * Вычисляет покрытие и gaps
     *!/
    private calculateCoverageAndGaps(
        tiles: SeriesTile[],
        rangeMs: { from: number; to: number }
    ): { coverage: number; gaps: Array<{ fromMs: number; toMs: number }> } {
        if (tiles.length === 0) {
            return {
                coverage: 0,
                gaps: [{ fromMs: rangeMs.from, toMs: rangeMs.to }]
            };
        }

        // Объединяем перекрывающиеся интервалы
        const mergedIntervals = this.mergeIntervals(
            tiles.map(t => t.coverageInterval)
        );

        // Вычисляем gaps
        const gaps: Array<{ fromMs: number; toMs: number }> = [];
        let coveredMs = 0;
        let currentPos = rangeMs.from;

        for (const interval of mergedIntervals) {
            // Интервал в пределах диапазона?
            const overlapStart = Math.max(interval.fromMs, rangeMs.from);
            const overlapEnd = Math.min(interval.toMs, rangeMs.to);

            if (overlapStart < overlapEnd) {
                // Есть gap перед этим интервалом?
                if (overlapStart > currentPos) {
                    gaps.push({ fromMs: currentPos, toMs: overlapStart });
                }

                coveredMs += overlapEnd - overlapStart;
                currentPos = overlapEnd;
            }
        }

        // Gap в конце?
        if (currentPos < rangeMs.to) {
            gaps.push({ fromMs: currentPos, toMs: rangeMs.to });
        }

        const totalMs = rangeMs.to - rangeMs.from;
        const coverage = totalMs > 0 ? (coveredMs / totalMs) * 100 : 0;

        return {
            coverage: Math.min(100, Math.max(0, coverage)),
            gaps
        };
    }

    /!**
     * Объединяет перекрывающиеся интервалы
     *!/
    private mergeIntervals(
        intervals: Array<{ fromMs: number; toMs: number }>
    ): Array<{ fromMs: number; toMs: number }> {
        if (intervals.length === 0) return [];

        const sorted = [...intervals].sort((a, b) => a.fromMs - b.fromMs);
        const merged: Array<{ fromMs: number; toMs: number }> = [sorted[0]!];

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i]!;
            const last = merged[merged.length - 1]!;

            if (current.fromMs <= last.toMs) {
                // Перекрываются - объединяем
                last.toMs = Math.max(last.toMs, current.toMs);
            } else {
                // Не перекрываются - добавляем новый
                merged.push({ ...current });
            }
        }

        return merged;
    }

    /!**
     * Проверяет, есть ли активные загрузки для диапазона
     *!/
    public hasLoadingTilesInRange(
        tiles: SeriesTile[],
        rangeMs: { from: number; to: number }
    ): boolean {
        return tiles.some(tile => {
            if (tile.status !== 'loading') return false;

            // Проверяем пересечение с диапазоном
            const overlaps =
                tile.coverageInterval.fromMs < rangeMs.to &&
                tile.coverageInterval.toMs > rangeMs.from;

            return overlaps;
        });
    }


    /!**
     * Проверяет покрытие только на конкретном уровне (без альтернатив)
     *!/
    public checkExactLevelCoveragePublic(
        tiles: SeriesTile[],
        rangeMs: { from: number; to: number },
        minCoveragePercent: number = 95
    ): { hasSufficientCoverage: boolean; coveragePercent: number } {
        const readyTiles = tiles.filter(t => t.status === 'ready');

        if (readyTiles.length === 0) {
            return { hasSufficientCoverage: false, coveragePercent: 0 };
        }

        const { coverage } = this.calculateCoverageAndGaps(readyTiles, rangeMs);

        return {
            hasSufficientCoverage: coverage >= minCoveragePercent,
            coveragePercent: coverage
        };
    }

    /!**
     * Оригинальный метод getBestAvailableData остается для обратной совместимости
     * но теперь он также использует новую логику проверки
     *!/
    // DataProxyService.ts:545 (в конце метода getBestAvailableData)

    public getBestAvailableData(
        seriesLevels: Record<BucketsMs, SeriesTile[]>,
        targetBucketMs: BucketsMs,
        timeRange: { from: Date; to: Date }
    ): ProxyDataResult {
        const rangeMs = {
            from: timeRange.from.getTime(),
            to: timeRange.to.getTime()
        };

        // Проверяем покрытие
        const coverageCheck = this.checkDataNeedsLoading(
            seriesLevels,
            {
                bucketMs: targetBucketMs,
                from: timeRange.from,
                to: timeRange.to,
                minCoveragePercent: 0
            }
        );

        // Пробуем получить точные данные
        const exactData = this.getExactData(seriesLevels, targetBucketMs, rangeMs);
        if (exactData.data && exactData.data.length > 0) {  // ДОБАВЛЕНО: проверка на undefined
            return {
                ...exactData,
                data: exactData.data || [],  // ДОБАВЛЕНО: гарантия массива
                coverage: coverageCheck.coveragePercent
            };
        }

        // Ищем ближайший уровень с данными
        const availableLevels = Object.keys(seriesLevels)
            .map(Number)
            .filter(bucket => {
                const tiles = seriesLevels[bucket] || [];
                return tiles.some(t => t.status === 'ready' && t.bins.length > 0);
            })
            .sort((a, b) => Math.abs(a - targetBucketMs) - Math.abs(b - targetBucketMs));

        if (availableLevels.length === 0) {
            return {
                data: [],  // УЖЕ ПРАВИЛЬНО
                sourceBucketMs: targetBucketMs,
                quality: 'none',
                coverage: 0,
                isStale: true
            };
        }

        const nearestBucket = availableLevels[0]!;
        const ratio = targetBucketMs / nearestBucket;

        // Определяем тип преобразования
        let result: ProxyDataResult;  // ДОБАВЛЕНО: временная переменная

        if (ratio > 1.5) {
            result = this.downsampleData(seriesLevels, nearestBucket, targetBucketMs, rangeMs);
        } else if (ratio < 0.66) {
            result = this.upsampleData(seriesLevels, nearestBucket, targetBucketMs, rangeMs);
        } else {
            result = this.interpolateData(seriesLevels, nearestBucket, targetBucketMs, rangeMs);
        }

        // КРИТИЧНО: Гарантируем что shared всегда массив
        return {
            ...result,
            data: result.data || []  // ДОБАВЛЕНО: защита от undefined
        };
    }

    /!**
     * Получает точные данные для уровня
     *!/
    private getExactData(
        seriesLevels: Record<BucketsMs, SeriesTile[]>,
        bucketMs: BucketsMs,
        rangeMs: { from: number; to: number }
    ): ProxyDataResult {
        const tiles = seriesLevels[bucketMs] || [];
        const readyTiles = tiles.filter(t => t.status === 'ready');

        if (readyTiles.length === 0) {
            return {
                data: [],
                sourceBucketMs: bucketMs,
                quality: 'none',
                coverage: 0,
                isStale: false
            };
        }

        // Собираем все bins в диапазоне
        const allBins: SeriesBinDto[] = [];
        let coveredMs = 0;

        for (const tile of readyTiles) {
            const tileStart = tile.coverageInterval.fromMs;
            const tileEnd = tile.coverageInterval.toMs;

            // Проверяем пересечение с запрошенным диапазоном
            if (tileEnd >= rangeMs.from && tileStart <= rangeMs.to) {
                const overlap = Math.min(tileEnd, rangeMs.to) - Math.max(tileStart, rangeMs.from);
                coveredMs += overlap;

                // Фильтруем bins по диапазону
                const filteredBins = tile.bins.filter(bin => {
                    const binTime = new Date(bin.t).getTime();
                    return binTime >= rangeMs.from && binTime <= rangeMs.to;
                });

                allBins.push(...filteredBins);
            }
        }

        // Сортируем и убираем дубликаты
        const uniqueBins = this.deduplicateAndSort(allBins);
        const totalRangeMs = rangeMs.to - rangeMs.from;
        const coverage = totalRangeMs > 0 ? (coveredMs / totalRangeMs) * 100 : 0;

        return {
            data: uniqueBins,
            sourceBucketMs: bucketMs,
            quality: 'exact',
            coverage: Math.min(100, coverage),
            isStale: false
        };
    }

    /!**
     * Downsampling - из детальных данных в грубые
     *!/
    private downsampleData(
        seriesLevels: Record<BucketsMs, SeriesTile[]>,
        sourceBucketMs: BucketsMs,
        targetBucketMs: BucketsMs,
        rangeMs: { from: number; to: number }
    ): ProxyDataResult {
        const sourceData = this.getExactData(seriesLevels, sourceBucketMs, rangeMs);

        if (sourceData.data.length === 0) {
            return { ...sourceData, quality: 'none' };
        }

        const downsampledBins: SeriesBinDto[] = [];
        const bucketSize = targetBucketMs;

        // Группируем данные по новым bucket'ам
        const buckets = new Map<number, SeriesBinDto[]>();

        for (const bin of sourceData.data) {
            const binTime = new Date(bin.t).getTime();
            const bucketKey = Math.floor(binTime / bucketSize) * bucketSize;

            if (!buckets.has(bucketKey)) {
                buckets.set(bucketKey, []);
            }
            buckets.get(bucketKey)!.push(bin);
        }

        // Агрегируем каждый bucket
        for (const [bucketTime, bins] of buckets) {
            const validBins = bins.filter(b => b.avg !== null);
            if (validBins.length === 0) continue;

            const values = validBins.map(b => b.avg!);
            const mins = validBins.map(b => b.min).filter(v => v !== null) as number[];
            const maxs = validBins.map(b => b.max).filter(v => v !== null) as number[];

            downsampledBins.push({
                t: new Date(bucketTime),
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: mins.length > 0 ? Math.min(...mins) : null,
                max: maxs.length > 0 ? Math.max(...maxs) : null,
                count: bins.reduce((sum, b) => sum + b.count, 0)
            });
        }

        return {
            data: downsampledBins.sort((a, b) => a.t.getTime() - b.t.getTime()),
            sourceBucketMs: sourceBucketMs,
            quality: 'downsampled',
            coverage: sourceData.coverage,
            isStale: true
        };
    }

    /!**
     * Upsampling - из грубых данных в детальные (с интерполяцией)
     *!/
    private upsampleData(
        seriesLevels: Record<BucketsMs, SeriesTile[]>,
        sourceBucketMs: BucketsMs,
        targetBucketMs: BucketsMs,
        rangeMs: { from: number; to: number }
    ): ProxyDataResult {
        const sourceData = this.getExactData(seriesLevels, sourceBucketMs, rangeMs);

        if (sourceData.data.length === 0) {
            return { ...sourceData, quality: 'none' };
        }

        const upsampledBins: SeriesBinDto[] = [];
        const pointsPerSourceBucket = Math.round(sourceBucketMs / targetBucketMs);

        for (let i = 0; i < sourceData.data.length; i++) {
            const currentBin = sourceData.data[i]!;
            const nextBin = sourceData.data[i + 1];

            if (!nextBin) {
                // Последняя точка - просто дублируем
                upsampledBins.push(currentBin);
                continue;
            }

            // Линейная интерполяция между точками
            const startTime = currentBin.t.getTime();
            const endTime = nextBin.t.getTime();
            const startValue = currentBin.avg || 0;
            const endValue = nextBin.avg || 0;

            for (let j = 0; j < pointsPerSourceBucket; j++) {
                const ratio = j / pointsPerSourceBucket;
                const interpolatedTime = startTime + (endTime - startTime) * ratio;

                if (interpolatedTime < rangeMs.from || interpolatedTime > rangeMs.to) {
                    continue;
                }

                const interpolatedValue = this.lerp(startValue, endValue, ratio);

                upsampledBins.push({
                    t: new Date(interpolatedTime),
                    avg: interpolatedValue,
                    min: currentBin.min !== null && nextBin.min !== null
                        ? this.lerp(currentBin.min, nextBin.min, ratio)
                        : null,
                    max: currentBin.max !== null && nextBin.max !== null
                        ? this.lerp(currentBin.max, nextBin.max, ratio)
                        : null,
                    count: Math.round(this.lerp(currentBin.count, nextBin.count, ratio))
                });
            }
        }

        return {
            data: upsampledBins,
            sourceBucketMs: sourceBucketMs,
            quality: 'upsampled',
            coverage: sourceData.coverage,
            isStale: true
        };
    }

    /!**
     * Интерполяция для близких уровней
     *!/
    private interpolateData(
        seriesLevels: Record<BucketsMs, SeriesTile[]>,
        sourceBucketMs: BucketsMs,
        targetBucketMs: BucketsMs,
        rangeMs: { from: number; to: number }
    ): ProxyDataResult {
        const sourceData = this.getExactData(seriesLevels, sourceBucketMs, rangeMs);

        if (sourceData.data.length === 0) {
            return { ...sourceData, quality: 'none' };
        }

        // Для близких уровней просто переиспользуем данные
        // с небольшой коррекцией времени если нужно
        const adjustedBins = sourceData.data.map(bin => {
            const binTime = new Date(bin.t).getTime();
            // Снаппинг к границам target bucket
            const snappedTime = Math.round(binTime / targetBucketMs) * targetBucketMs;

            return {
                ...bin,
                t: new Date(snappedTime)
            };
        });

        return {
            data: this.deduplicateAndSort(adjustedBins),
            sourceBucketMs: sourceBucketMs,
            quality: 'interpolated',
            coverage: sourceData.coverage,
            isStale: true
        };
    }

    /!**
     * Линейная интерполяция
     *!/
    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    /!**
     * Убирает дубликаты и сортирует
     *!/
    private deduplicateAndSort(bins: SeriesBinDto[]): SeriesBinDto[] {
        if (!bins || !Array.isArray(bins) || bins.length === 0) {
            return [];
        }

        const uniqueMap = new Map<number, SeriesBinDto>();

        for (const bin of bins) {
            // Проверяем валидность bin
            if (!bin || bin.t === null || bin.t === undefined) {
                continue;
            }

            try {
                const time = new Date(bin.t).getTime();
                if (isNaN(time)) {
                    continue;
                }

                if (!uniqueMap.has(time) || (bin.count || 0) > (uniqueMap.get(time)?.count || 0)) {
                    uniqueMap.set(time, bin);
                }
            } catch (error) {
                console.warn('Invalid bin in deduplicateAndSort:', bin);
            }
        }

        return Array.from(uniqueMap.values())
            .filter(bin => bin && bin.t !== null && bin.t !== undefined)
            .sort((a, b) => {
                try {
                    return new Date(a.t).getTime() - new Date(b.t).getTime();
                } catch {
                    return 0;
                }
            });
    }
}

export const dataProxyService = DataProxyService.getInstance();*/
