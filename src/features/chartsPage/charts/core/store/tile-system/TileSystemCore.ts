
import type {CoverageInterval, OriginalRange, SeriesTile} from "@chartsPage/charts/core/store/types/chart.types.ts";
import type {SeriesBinDto} from "@chartsPage/charts/core/dtos/SeriesBinDto.ts";


/**
 * Результат операции добавления тайла
 */
export interface AddTileResult {
    readonly tiles: readonly SeriesTile[];
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





/**
 * Стратегия при конфликтах тайлов
 */
export type ConflictStrategy = 'replace' | 'merge' | 'throw';

/**
 * Опции для addTile
 */
export interface AddTileOptions {
    readonly strategy?: ConflictStrategy | undefined;
    readonly onDataLoss?: ((lostTile: SeriesTile) => void) | undefined;
    readonly validate?: boolean | undefined;
}

/**
 * Ядро системы управления тайлами
 * Чистые функции для работы с тайлами
 */
export class TileSystemCore {

    /**
     * Добавить тайл в систему
     * Обрабатывает перекрытия: merge или split существующих тайлов
     */
    static addTile(
        originalRange: OriginalRange,
        tiles: SeriesTile[],
        newTile: SeriesTile,
        options?: AddTileOptions
    ): AddTileResult {
        const {
            strategy = 'replace',
            onDataLoss,
            validate = true
        } = options ?? {};

        // Валидация
        if (validate) {
            this.validateInterval(newTile.coverageInterval, 'newTile');
            this.validateInterval(originalRange, 'originalRange');
        }

        // Проверка: тайл в пределах originalRange
        if (!this.isWithinRange(newTile.coverageInterval, originalRange)) {
            console.warn('[TileSystemCore] Tile outside original range', {
                tile: newTile.coverageInterval,
                range: originalRange
            });
            return {
                tiles: tiles,
                wasAdded: false,
                wasMerged: false,
                affectedIndices: []
            };
        }

        const resultTiles: SeriesTile[] = [];
        const affectedIndices: number[] = [];
        let wasAdded = false;
        let wasMerged = false;
        let currentNewTile = newTile;

        // Обрабатываем существующие тайлы
        for (let i = 0; i < tiles.length; i++) {
            const existing = tiles[i]!;
            const overlap = this.analyzeOverlap(
                existing.coverageInterval,
                currentNewTile.coverageInterval
            );

            switch (overlap.type) {
                case 'none':
                    resultTiles.push(existing);
                    break;

                case 'full': {
                    // Существующий полностью поглощается новым
                    const hasData = existing.status === 'ready' && existing.bins.length > 0;

                    if (hasData) {
                        if (strategy === 'throw') {
                            throw new Error(
                                `Data loss: tile [${existing.coverageInterval.fromMs}-${existing.coverageInterval.toMs}] ` +
                                `with ${existing.bins.length} bins would be lost`
                            );
                        }

                        if (strategy === 'merge' && currentNewTile.status === 'ready') {
                            const mergedBins = this.mergeBins(existing.bins, currentNewTile.bins);
                            currentNewTile = { ...currentNewTile, bins: mergedBins };
                        }

                        onDataLoss?.(existing);
                    }

                    affectedIndices.push(i);
                    wasMerged = true;
                    break;
                }

                case 'contains': {
                    //   ИСПРАВЛЕНО: Всегда split, независимо от статуса
                    const parts = this.splitTile(existing, currentNewTile.coverageInterval);

                    if (parts.length === 0) {
                        console.warn('[addTile] Tile fully removed by split:', existing.coverageInterval);
                    }

                    resultTiles.push(...parts);
                    affectedIndices.push(i);
                    wasMerged = true;
                    break;
                }

                case 'partial': {
                    //   ИСПРАВЛЕНО: Всегда trim, независимо от статуса
                    const trimmed = this.trimTile(existing, currentNewTile.coverageInterval);

                    if (trimmed) {
                        resultTiles.push(trimmed);
                    } else {
                        console.warn('[addTile] Tile fully removed by trim:', existing.coverageInterval);
                    }

                    // Merge только для ready тайлов
                    if (strategy === 'merge' &&
                        existing.status === 'ready' &&
                        currentNewTile.status === 'ready') {
                        //   ИСПРАВЛЕНО: Фильтруем bins из обоих тайлов
                        const existingOverlapBins = existing.bins.filter(bin => {
                            const t = bin.t.getTime();
                            return overlap.overlapFrom !== undefined &&
                                overlap.overlapTo !== undefined &&
                                t >= overlap.overlapFrom &&
                                t < overlap.overlapTo;
                        });

                        const newTileOverlapBins = currentNewTile.bins.filter(bin => {
                            const t = bin.t.getTime();
                            return overlap.overlapFrom !== undefined &&
                                overlap.overlapTo !== undefined &&
                                t >= overlap.overlapFrom &&
                                t < overlap.overlapTo;
                        });

                        if (existingOverlapBins.length > 0 || newTileOverlapBins.length > 0) {
                            const mergedOverlapBins = this.mergeBins(existingOverlapBins, newTileOverlapBins);

                            // Заменяем bins в newTile
                            const nonOverlapBins = currentNewTile.bins.filter(bin => {
                                const t = bin.t.getTime();
                                return !(overlap.overlapFrom !== undefined &&
                                    overlap.overlapTo !== undefined &&
                                    t >= overlap.overlapFrom &&
                                    t < overlap.overlapTo);
                            });

                            const allBins = [...nonOverlapBins, ...mergedOverlapBins]
                                .sort((a, b) => a.t.getTime() - b.t.getTime());

                            currentNewTile = { ...currentNewTile, bins: allBins };
                        }
                    }

                    affectedIndices.push(i);
                    wasMerged = true;
                    break;
                }
            }
        }

        // Добавляем новый тайл
        resultTiles.push(currentNewTile);
        wasAdded = true;

        // Сортируем
        const sorted = this.sortTiles(resultTiles);

        // Валидация результата
        if (validate) {
            this.validateNoOverlaps(sorted);
        }

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
        tiles: SeriesTile[],
        index: number
    ): readonly SeriesTile[] {
        if (index < 0 || index >= tiles.length) {
            console.warn('[TileSystemCore] Invalid tile index:', index);
            return tiles;
        }

        return [
            ...tiles.slice(0, index),
            ...tiles.slice(index + 1)
        ];
    }

    /**
     * Обновить статус тайла
     */
    static updateTileStatus(
        tiles: SeriesTile[],
        interval: CoverageInterval,
        status: SeriesTile['status'],
        error?: string | undefined
    ): readonly SeriesTile[] {
        return tiles.map(tile => {
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
        originalRange: OriginalRange,
        tiles: readonly SeriesTile[],
        targetInterval?: CoverageInterval | undefined
    ): FindGapsResult {
        const range = targetInterval ?? originalRange;
        const readyTiles = tiles.filter(t => t.status === 'ready');

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
    static getStats(originalRange: OriginalRange,
                    tiles: SeriesTile[],): {
        readonly totalTiles: number;
        readonly readyTiles: number;
        readonly loadingTiles: number;
        readonly errorTiles: number;
        readonly totalBins: number;
        readonly coverage: number;
    } {
        const readyTiles = tiles.filter(t => t.status === 'ready');
        const { coverage } = this.findGaps(originalRange, tiles);

        return {
            totalTiles: tiles.length,
            readyTiles: readyTiles.length,
            loadingTiles: tiles.filter(t => t.status === 'loading').length,
            errorTiles: tiles.filter(t => t.status === 'error').length,
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
        tile: SeriesTile,
        excludeInterval: CoverageInterval
    ): readonly SeriesTile[] {
        const parts: SeriesTile[] = [];

        // Левая часть
        if (tile.coverageInterval.fromMs < excludeInterval.fromMs) {
            const leftBins = tile.status === 'ready'
                ? tile.bins.filter(bin => bin.t.getTime() < excludeInterval.fromMs)
                : [];

            // Для ready проверяем bins, для остальных создаём без bins
            if (tile.status !== 'ready' || leftBins.length > 0) {
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

        // Правая часть
        if (tile.coverageInterval.toMs > excludeInterval.toMs) {
            const rightBins = tile.status === 'ready'
                ? tile.bins.filter(bin => bin.t.getTime() >= excludeInterval.toMs)
                : [];

            if (tile.status !== 'ready' || rightBins.length > 0) {
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
     * Валидация интервала
     */
    private static validateInterval(
        interval: CoverageInterval,
        name: string
    ): void {
        if (!Number.isFinite(interval.fromMs) || !Number.isFinite(interval.toMs)) {
            throw new Error(`[${name}] Invalid interval: fromMs and toMs must be finite numbers`);
        }

        if (interval.fromMs >= interval.toMs) {
            throw new Error(
                `[${name}] Invalid interval: fromMs (${interval.fromMs}) must be < toMs (${interval.toMs})`
            );
        }
    }

    /**
     * Валидация отсутствия перекрытий
     */
    private static validateNoOverlaps(tiles: readonly SeriesTile[]): void {
        for (let i = 0; i < tiles.length - 1; i++) {
            const current = tiles[i]!;
            const next = tiles[i + 1]!;

            if (current.coverageInterval.toMs > next.coverageInterval.fromMs) {
                throw new Error(
                    `Overlapping tiles: [${current.coverageInterval.fromMs}-${current.coverageInterval.toMs}] ` +
                    `and [${next.coverageInterval.fromMs}-${next.coverageInterval.toMs}]`
                );
            }
        }
    }

    /**
     * Объединить bins из двух тайлов (по уникальному timestamp)
     */
    private static mergeBins(
        bins1: readonly SeriesBinDto[],
        bins2: readonly SeriesBinDto[]
    ): SeriesBinDto[] {
        const map = new Map<number, SeriesBinDto>();

        // Добавляем bins1
        bins1.forEach(bin => {
            map.set(bin.t.getTime(), bin);
        });

        // Добавляем bins2 (перезаписываем дубликаты)
        bins2.forEach(bin => {
            map.set(bin.t.getTime(), bin);
        });

        // Сортируем по времени
        return Array.from(map.values()).sort((a, b) => a.t.getTime() - b.t.getTime());
    }

    /**
     * Обрезать тайл, удаляя перекрытие с указанным интервалом
     */
    /**
     *   ИСПРАВЛЕНО: Случай 2 выбрасывает ошибку
     */
    private static trimTile(
        tile: SeriesTile,
        trimInterval: CoverageInterval
    ): SeriesTile | null {
        const tileInterval = tile.coverageInterval;

        // Случай 1: Полное поглощение
        if (trimInterval.fromMs <= tileInterval.fromMs &&
            trimInterval.toMs >= tileInterval.toMs) {
            return null;
        }

        // Случай 2: trimInterval внутри tile
        if (trimInterval.fromMs > tileInterval.fromMs &&
            trimInterval.toMs < tileInterval.toMs) {
            //   ИСПРАВЛЕНО: Не можем обработать - это баг вызывающего кода
            throw new Error(
                '[trimTile] Cannot trim: interval is inside tile. Use splitTile instead. ' +
                `tile: [${tileInterval.fromMs}-${tileInterval.toMs}], ` +
                `trim: [${trimInterval.fromMs}-${trimInterval.toMs}]`
            );
        }

        // Случай 3: Обрезаем слева
        if (trimInterval.fromMs <= tileInterval.fromMs &&
            trimInterval.toMs > tileInterval.fromMs &&
            trimInterval.toMs < tileInterval.toMs) {
            const keepFrom = trimInterval.toMs;
            const keepTo = tileInterval.toMs;

            const filteredBins = tile.status === 'ready'
                ? tile.bins.filter(bin => {
                    const t = bin.t.getTime();
                    return t >= keepFrom && t < keepTo;
                })
                : [];

            if (tile.status !== 'ready' || filteredBins.length > 0) {
                return {
                    ...tile,
                    coverageInterval: { fromMs: keepFrom, toMs: keepTo },
                    bins: filteredBins
                };
            }

            return null;
        }

        // Случай 4: Обрезаем справа
        if (trimInterval.toMs >= tileInterval.toMs &&
            trimInterval.fromMs > tileInterval.fromMs &&
            trimInterval.fromMs < tileInterval.toMs) {
            const keepFrom = tileInterval.fromMs;
            const keepTo = trimInterval.fromMs;

            const filteredBins = tile.status === 'ready'
                ? tile.bins.filter(bin => {
                    const t = bin.t.getTime();
                    return t >= keepFrom && t < keepTo;
                })
                : [];

            if (tile.status !== 'ready' || filteredBins.length > 0) {
                return {
                    ...tile,
                    coverageInterval: { fromMs: keepFrom, toMs: keepTo },
                    bins: filteredBins
                };
            }

            return null;
        }

        // Нет перекрытия
        return tile;
    }

    /**
     * Сортировать тайлы по fromMs
     */
    private static sortTiles(tiles: readonly SeriesTile[]): readonly SeriesTile[] {
        return [...tiles].sort(
            (a, b) => a.coverageInterval.fromMs - b.coverageInterval.fromMs
        );
    }


    /**
     * Найти объединённый gap (от первой пустоты до последней)
     *
     * @example
     * // Сценарий 1: Полный диапазон
     * originalRange = [0, 1000]
     * tiles = [[100, 300], [600, 800]]
     * targetInterval = undefined (используется originalRange)
     * // Gaps: [0, 100], [300, 600], [800, 1000]
     * // Результат: { fromMs: 0, toMs: 1000 }
     *
     * @example
     * // Сценарий 2: Целевой диапазон (ваш случай)
     * originalRange = [0, 1000]
     * tiles = [[100, 300], [600, 800]]
     * targetInterval = [200, 700]
     * // Покрытие в [200, 700]: [200, 300] и [600, 700]
     * // Gaps в [200, 700]: [300, 600]
     * // Результат: { fromMs: 300, toMs: 600 }
     *
     * @example
     * // Сценарий 3: Два отдельных gap
     * originalRange = [0, 1000]
     * tiles = [[300, 700]]
     * targetInterval = [0, 1000]
     * // Gaps: [0, 300], [700, 1000]
     * // Результат: { fromMs: 0, toMs: 1000 }
     *
     * @example
     * // Сценарий 4: Нет gaps
     * tiles = [[0, 1000]]
     * targetInterval = [200, 800]
     * // Результат: null (полное покрытие)
     */
    static findUnifiedGap(
        originalRange: OriginalRange,
        tiles: readonly SeriesTile[],
        targetInterval?: CoverageInterval | undefined
    ): CoverageInterval | null {
        const gapsResult = this.findGaps(originalRange, tiles, targetInterval);

        if (gapsResult.gaps.length === 0) {
            return null;
        }

        if (gapsResult.gaps.length === 1) {
            return gapsResult.gaps[0]!;
        }

        const firstGap = gapsResult.gaps[0]!;
        const lastGap = gapsResult.gaps[gapsResult.gaps.length - 1]!;

        return {
            fromMs: firstGap.fromMs,
            toMs: lastGap.toMs
        };
    }
}