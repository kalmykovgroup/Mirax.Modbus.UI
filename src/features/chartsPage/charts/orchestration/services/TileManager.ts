// orchestration/services/TileManager.ts

import type {
    SeriesTile,
    CoverageInterval,
    BucketsMs
} from '@chartsPage/charts/core/store/types/chart.types';
import type { SeriesBinDto } from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";

export class TileManager {
    private tiles: SeriesTile[] = [];
    private bucketMs: BucketsMs;
    private originalRange: CoverageInterval;

    constructor(bucketMs: BucketsMs, originalRange: CoverageInterval) {
        this.bucketMs = bucketMs;
        this.originalRange = originalRange;
        this.initializeEmpty();
    }

    /**
     * Инициализация пустым тайлом на весь диапазон
     */
    private initializeEmpty(): void {
        this.tiles = [{
            coverageInterval: { ...this.originalRange },
            bins: [],
            status: 'empty',
            loadedAt: Date.now()
        }];

        console.log('[TileManager] Initialized with empty tile:', {
            from: new Date(this.originalRange.fromMs).toISOString(),
            to: new Date(this.originalRange.toMs).toISOString()
        });
    }

    /**
     * Подготовка к загрузке - создание loading тайла
     */
    prepareLoading(interval: CoverageInterval, requestId: string): void {
        const newTiles: SeriesTile[] = [];

        for (const tile of this.tiles) {
            const overlap = this.calculateOverlap(tile.coverageInterval, interval);

            if (overlap.type === 'none') {
                // Нет пересечения - оставляем как есть
                newTiles.push(tile);
                continue;
            }

            if (tile.status === 'ready' || tile.status === 'loading') {
                // Ready и loading тайлы не трогаем
                newTiles.push(tile);

                if (tile.status === 'ready') {
                    console.warn('[TileManager] Loading overlaps with ready tile!', {
                        ready: this.formatInterval(tile.coverageInterval),
                        loading: this.formatInterval(interval)
                    });
                }
                continue;
            }

            if (tile.status === 'empty') {
                // Разбиваем пустой тайл
                const parts = this.splitTile(tile, interval, 'loading', requestId);
                newTiles.push(...parts);
            }
        }

        this.tiles = this.sortAndValidate(newTiles);
        this.logState('After prepareLoading');
    }

    /**
     * Обработка полученных данных
     */
    processResponse(requestInterval: CoverageInterval, bins: SeriesBinDto[]): void {
        const newTiles: SeriesTile[] = [];
        let processed = false;

        for (const tile of this.tiles) {
            if (tile.status === 'loading' &&
                tile.coverageInterval.fromMs === requestInterval.fromMs &&
                tile.coverageInterval.toMs === requestInterval.toMs) {

                // Заменяем loading на ready
                newTiles.push({
                    ...tile,
                    bins: bins.filter(bin =>
                        bin.t.getTime() >= tile.coverageInterval.fromMs &&
                        bin.t.getTime() < tile.coverageInterval.toMs
                    ),
                    status: 'ready',
                    loadedAt: Date.now(),
                    requestId: undefined
                });
                processed = true;
            } else {
                newTiles.push(tile);
            }
        }

        if (!processed) {
            console.error('[TileManager] Loading tile not found for interval:',
                this.formatInterval(requestInterval));
        }

        this.tiles = this.sortAndValidate(newTiles);
        this.logState('After processResponse');
    }

    /**
     * Расчёт покрытия для диапазона
     */
    calculateCoverage(interval: CoverageInterval): {
        percentage: number;
        coveredBuckets: number;
        totalBuckets: number;
        gaps: CoverageInterval[];
    } {
        const totalBuckets = Math.ceil((interval.toMs - interval.fromMs) / this.bucketMs);
        const coveredBuckets = new Set<number>();
        const gaps: CoverageInterval[] = [];

        let currentPos = interval.fromMs;

        for (const tile of this.tiles) {
            if (tile.status !== 'ready' || tile.bins.length === 0) continue;

            const overlap = this.calculateOverlap(tile.coverageInterval, interval);
            if (overlap.type === 'none') continue;

            // Считаем покрытые buckets
            const startBucket = Math.floor((overlap.overlapStart! - interval.fromMs) / this.bucketMs);
            const endBucket = Math.ceil((overlap.overlapEnd! - interval.fromMs) / this.bucketMs);

            for (let i = startBucket; i < endBucket; i++) {
                if (i >= 0 && i < totalBuckets) {
                    coveredBuckets.add(i);
                }
            }

            // Находим gaps
            if (overlap.overlapStart! > currentPos) {
                gaps.push({ fromMs: currentPos, toMs: overlap.overlapStart! });
            }
            currentPos = Math.max(currentPos, overlap.overlapEnd!);
        }

        if (currentPos < interval.toMs) {
            gaps.push({ fromMs: currentPos, toMs: interval.toMs });
        }

        const percentage = totalBuckets > 0
            ? Math.min(100, (coveredBuckets.size / totalBuckets) * 100)
            : 0;

        return {
            percentage,
            coveredBuckets: coveredBuckets.size,
            totalBuckets,
            gaps
        };
    }

    /**
     * Разбиение тайла на части
     */
    private splitTile(
        tile: SeriesTile,
        splitInterval: CoverageInterval,
        newStatus: 'loading' | 'ready',
        requestId?: string
    ): SeriesTile[] {
        const parts: SeriesTile[] = [];
        const overlap = this.calculateOverlap(tile.coverageInterval, splitInterval);

        // Левая часть
        if (overlap.hasLeftPart) {
            parts.push({
                coverageInterval: {
                    fromMs: tile.coverageInterval.fromMs,
                    toMs: overlap.overlapStart!
                },
                bins: [],
                status: tile.status
            });
        }

        // Средняя часть (новый статус)
        parts.push({
            coverageInterval: {
                fromMs: overlap.overlapStart!,
                toMs: overlap.overlapEnd!
            },
            bins: [],
            status: newStatus,
            requestId
        });

        // Правая часть
        if (overlap.hasRightPart) {
            parts.push({
                coverageInterval: {
                    fromMs: overlap.overlapEnd!,
                    toMs: tile.coverageInterval.toMs
                },
                bins: [],
                status: tile.status
            });
        }

        return parts;
    }

    /**
     * Расчёт пересечения интервалов
     */
    private calculateOverlap(
        interval1: CoverageInterval,
        interval2: CoverageInterval
    ): {
        type: 'none' | 'partial' | 'full';
        overlapStart?: number;
        overlapEnd?: number;
        hasLeftPart: boolean;
        hasRightPart: boolean;
    } {
        if (interval1.toMs <= interval2.fromMs || interval1.fromMs >= interval2.toMs) {
            return { type: 'none', hasLeftPart: false, hasRightPart: false };
        }

        const overlapStart = Math.max(interval1.fromMs, interval2.fromMs);
        const overlapEnd = Math.min(interval1.toMs, interval2.toMs);

        const hasLeftPart = interval1.fromMs < overlapStart;
        const hasRightPart = interval1.toMs > overlapEnd;

        const type = (!hasLeftPart && !hasRightPart) ? 'full' : 'partial';

        return { type, overlapStart, overlapEnd, hasLeftPart, hasRightPart };
    }

    /**
     * Сортировка и валидация тайлов
     */
    private sortAndValidate(tiles: SeriesTile[]): SeriesTile[] {
        const sorted = [...tiles].sort((a, b) =>
            a.coverageInterval.fromMs - b.coverageInterval.fromMs
        );

        // Проверка на перекрытия и пробелы
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];

            if (curr.coverageInterval.fromMs < prev.coverageInterval.toMs) {
                console.error('[TileManager] OVERLAP DETECTED!', {
                    tile1: this.formatInterval(prev.coverageInterval),
                    tile2: this.formatInterval(curr.coverageInterval)
                });
            }

            if (curr.coverageInterval.fromMs > prev.coverageInterval.toMs) {
                console.warn('[TileManager] GAP DETECTED!', {
                    gapSize: curr.coverageInterval.fromMs - prev.coverageInterval.toMs,
                    between: [
                        this.formatInterval(prev.coverageInterval),
                        this.formatInterval(curr.coverageInterval)
                    ]
                });
            }
        }

        return sorted;
    }

    /**
     * Логирование состояния
     */
    private logState(context: string): void {
        console.log(`[TileManager] ${context}:`, {
            totalTiles: this.tiles.length,
            ready: this.tiles.filter(t => t.status === 'ready').length,
            loading: this.tiles.filter(t => t.status === 'loading').length,
            empty: this.tiles.filter(t => t.status === 'empty').length,
            tiles: this.tiles.map(t => ({
                status: t.status,
                interval: this.formatInterval(t.coverageInterval),
                bins: t.bins.length
            }))
        });
    }

    private formatInterval(interval: CoverageInterval): string {
        return `${new Date(interval.fromMs).toISOString().substr(11, 8)} - ${new Date(interval.toMs).toISOString().substr(11, 8)}`;
    }

    /**
     * Получить текущие тайлы
     */
    getTiles(): readonly SeriesTile[] {
        return [...this.tiles];
    }

    /**
     * Проверить есть ли loading тайлы
     */
    hasLoadingTiles(): boolean {
        return this.tiles.some(t => t.status === 'loading');
    }
}