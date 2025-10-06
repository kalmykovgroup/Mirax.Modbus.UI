
import type {
    Tile,
    TileSystem,
    AddTileResult,
    FindGapsResult,
    OriginalRange,
    OverlapAnalysis
} from './tile-system.types';
import type {CoverageInterval} from "@chartsPage/charts/core/store/types/chart.types.ts";

/**
 * Ядро системы управления тайлами
 * Чистые функции для работы с тайлами
 */
export class TileSystemCore {
    /**
     * Создать пустую систему тайлов
     */
    static create(originalRange: OriginalRange): TileSystem {
        return {
            originalRange,
            tiles: [],
            totalBins: 0,
            lastUpdated: Date.now()
        };
    }

    /**
     * Добавить тайл в систему
     * Обрабатывает перекрытия: merge или split существующих тайлов
     */
    static addTile(
        system: TileSystem,
        newTile: Tile
    ): AddTileResult {
        // Валидация: тайл в пределах originalRange
        if (!this.isWithinRange(newTile.coverageInterval, system.originalRange)) {
            console.warn('[TileSystemCore] Tile outside original range', {
                tile: newTile.coverageInterval,
                range: system.originalRange
            });
            return {
                tiles: system.tiles,
                wasAdded: false,
                wasMerged: false,
                affectedIndices: []
            };
        }

        const resultTiles: Tile[] = [];
        const affectedIndices: number[] = [];
        let wasAdded = false;
        let wasMerged = false;

        // Обрабатываем существующие тайлы
        for (let i = 0; i < system.tiles.length; i++) {
            const existing = system.tiles[i]!;
            const overlap = this.analyzeOverlap(
                existing.coverageInterval,
                newTile.coverageInterval
            );

            switch (overlap.type) {
                case 'none':
                    // Нет перекрытия - оставляем как есть
                    resultTiles.push(existing);
                    break;

                case 'full':
                    // Существующий тайл полностью поглощается новым - пропускаем
                    affectedIndices.push(i);
                    wasMerged = true;
                    break;

                case 'contains':
                    // Существующий тайл содержит новый - split
                    if (existing.status === 'ready') {
                        const parts = this.splitTile(existing, newTile.coverageInterval);
                        resultTiles.push(...parts);
                        affectedIndices.push(i);
                        wasMerged = true;
                    } else {
                        // Для loading/error тайлов - оставляем как есть
                        resultTiles.push(existing);
                    }
                    break;

                case 'partial':
                    // Частичное перекрытие
                    if (existing.status === 'ready' && newTile.status === 'ready') {
                        // Обрезаем существующий тайл
                        const trimmed = this.trimTile(existing, newTile.coverageInterval);
                        if (trimmed) {
                            resultTiles.push(trimmed);
                        }
                        affectedIndices.push(i);
                        wasMerged = true;
                    } else {
                        // Для loading/error - оставляем
                        resultTiles.push(existing);
                    }
                    break;
            }
        }

        // Добавляем новый тайл
        resultTiles.push(newTile);
        wasAdded = true;

        // Сортируем по fromMs
        const sorted = this.sortTiles(resultTiles);

        return {
            tiles: sorted,
            wasAdded,
            wasMerged,
            affectedIndices
        };
    }

    /**
     * Удалить тайл по индексу
     */
    static removeTile(
        system: TileSystem,
        index: number
    ): readonly Tile[] {
        if (index < 0 || index >= system.tiles.length) {
            console.warn('[TileSystemCore] Invalid tile index:', index);
            return system.tiles;
        }

        return [
            ...system.tiles.slice(0, index),
            ...system.tiles.slice(index + 1)
        ];
    }

    /**
     * Обновить статус тайла
     */
    static updateTileStatus(
        system: TileSystem,
        interval: CoverageInterval,
        status: Tile['status'],
        error?: string | undefined
    ): readonly Tile[] {
        return system.tiles.map(tile => {
            if (this.intervalsEqual(tile.coverageInterval, interval)) {
                return {
                    ...tile,
                    status,
                    error,
                    loadedAt: status === 'ready' ? Date.now() : tile.loadedAt
                };
            }
            return tile;
        });
    }

    /**
     * Найти незагруженные диапазоны (gaps)
     */
    static findGaps(
        system: TileSystem,
        targetInterval?: CoverageInterval | undefined
    ): FindGapsResult {
        const range = targetInterval ?? system.originalRange;
        const readyTiles = system.tiles.filter(t => t.status === 'ready');

        if (readyTiles.length === 0) {
            return {
                gaps: [range],
                coverage: 0,
                hasFull: false
            };
        }

        // Сортируем ready тайлы
        const sorted = this.sortTiles(readyTiles);

        const gaps: CoverageInterval[] = [];
        let coveredMs = 0;
        let currentPos = range.fromMs;

        for (const tile of sorted) {
            const tileStart = Math.max(tile.coverageInterval.fromMs, range.fromMs);
            const tileEnd = Math.min(tile.coverageInterval.toMs, range.toMs);

            // Пропускаем тайлы вне целевого диапазона
            if (tileEnd <= tileStart || tileStart >= range.toMs) {
                continue;
            }

            // Нашли gap перед тайлом
            if (tileStart > currentPos) {
                gaps.push({
                    fromMs: currentPos,
                    toMs: tileStart
                });
            }

            // Учитываем покрытие
            const overlap = Math.max(0, tileEnd - Math.max(currentPos, tileStart));
            if (overlap > 0) {
                coveredMs += overlap;
                currentPos = Math.max(currentPos, tileEnd);
            }
        }

        // Gap в конце
        if (currentPos < range.toMs) {
            gaps.push({
                fromMs: currentPos,
                toMs: range.toMs
            });
        }

        const totalMs = range.toMs - range.fromMs;
        const coverage = totalMs > 0 ? (coveredMs / totalMs) * 100 : 0;

        return {
            gaps,
            coverage: Math.min(100, coverage),
            hasFull: coverage >= 99.9
        };
    }

    /**
     * Получить статистику системы
     */
    static getStats(system: TileSystem): {
        readonly totalTiles: number;
        readonly readyTiles: number;
        readonly loadingTiles: number;
        readonly errorTiles: number;
        readonly totalBins: number;
        readonly coverage: number;
    } {
        const readyTiles = system.tiles.filter(t => t.status === 'ready');
        const { coverage } = this.findGaps(system);

        return {
            totalTiles: system.tiles.length,
            readyTiles: readyTiles.length,
            loadingTiles: system.tiles.filter(t => t.status === 'loading').length,
            errorTiles: system.tiles.filter(t => t.status === 'error').length,
            totalBins: readyTiles.reduce((sum, t) => sum + t.bins.length, 0),
            coverage
        };
    }

    // ============================================
    // ПРИВАТНЫЕ УТИЛИТЫ
    // ============================================

    private static isWithinRange(
        interval: CoverageInterval,
        range: OriginalRange
    ): boolean {
        return interval.fromMs >= range.fromMs &&
            interval.toMs <= range.toMs;
    }

    private static intervalsEqual(
        a: CoverageInterval,
        b: CoverageInterval
    ): boolean {
        return a.fromMs === b.fromMs && a.toMs === b.toMs;
    }

    private static analyzeOverlap(
        interval1: CoverageInterval,
        interval2: CoverageInterval
    ): OverlapAnalysis {
        // Нет перекрытия
        if (interval1.toMs <= interval2.fromMs || interval1.fromMs >= interval2.toMs) {
            return { type: 'none' };
        }

        // interval1 полностью внутри interval2
        if (interval1.fromMs >= interval2.fromMs && interval1.toMs <= interval2.toMs) {
            return {
                type: 'full',
                overlapFrom: interval1.fromMs,
                overlapTo: interval1.toMs
            };
        }

        // interval1 содержит interval2
        if (interval1.fromMs <= interval2.fromMs && interval1.toMs >= interval2.toMs) {
            return {
                type: 'contains',
                overlapFrom: interval2.fromMs,
                overlapTo: interval2.toMs
            };
        }

        // Частичное перекрытие
        const overlapFrom = Math.max(interval1.fromMs, interval2.fromMs);
        const overlapTo = Math.min(interval1.toMs, interval2.toMs);

        return {
            type: 'partial',
            overlapFrom,
            overlapTo
        };
    }

    /**
     * Разделить тайл на части, исключая указанный интервал
     */
    private static splitTile(
        tile: Tile,
        excludeInterval: CoverageInterval
    ): readonly Tile[] {
        const parts: Tile[] = [];

        // Левая часть (до excludeInterval)
        if (tile.coverageInterval.fromMs < excludeInterval.fromMs) {
            const leftBins = tile.bins.filter(
                bin => bin.t.getTime() < excludeInterval.fromMs
            );

            if (leftBins.length > 0) {
                parts.push({
                    ...tile,
                    coverageInterval: {
                        fromMs: tile.coverageInterval.fromMs,
                        toMs: excludeInterval.fromMs
                    },
                    bins: leftBins
                });
            }
        }

        // Правая часть (после excludeInterval)
        if (tile.coverageInterval.toMs > excludeInterval.toMs) {
            const rightBins = tile.bins.filter(
                bin => bin.t.getTime() >= excludeInterval.toMs
            );

            if (rightBins.length > 0) {
                parts.push({
                    ...tile,
                    coverageInterval: {
                        fromMs: excludeInterval.toMs,
                        toMs: tile.coverageInterval.toMs
                    },
                    bins: rightBins
                });
            }
        }

        return parts;
    }

    /**
     * Обрезать тайл, удаляя перекрытие с указанным интервалом
     */
    private static trimTile(
        tile: Tile,
        trimInterval: CoverageInterval
    ): Tile | null {
        // Определяем какую часть оставить
        let keepFrom = tile.coverageInterval.fromMs;
        let keepTo = tile.coverageInterval.toMs;

        // Обрезаем слева
        if (trimInterval.fromMs <= keepFrom && trimInterval.toMs > keepFrom) {
            keepFrom = trimInterval.toMs;
        }

        // Обрезаем справа
        if (trimInterval.toMs >= keepTo && trimInterval.fromMs < keepTo) {
            keepTo = trimInterval.fromMs;
        }

        // Ничего не осталось
        if (keepFrom >= keepTo) {
            return null;
        }

        // Фильтруем bins
        const filteredBins = tile.bins.filter(bin => {
            const t = bin.t.getTime();
            return t >= keepFrom && t < keepTo;
        });

        if (filteredBins.length === 0) {
            return null;
        }

        return {
            ...tile,
            coverageInterval: { fromMs: keepFrom, toMs: keepTo },
            bins: filteredBins
        };
    }

    /**
     * Сортировать тайлы по fromMs
     */
    private static sortTiles(tiles: readonly Tile[]): readonly Tile[] {
        return [...tiles].sort(
            (a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs
        );
    }
}