// @chartsPage/charts/cache/CacheManager.ts

import type {
    CachedTile,
    CacheKey,
    CacheLookupResult,
    CachePolicy,
    CacheSaveOptions,
    CacheStats
} from '../types/cache.types';
import type { BucketsMs, CoverageInterval, FieldName, SeriesTile } from '@chartsPage/charts/core/store/types/chart.types';
import type { SeriesBinDto } from '@chartsPage/charts/core/dtos/SeriesBinDto';
import { CacheKeyBuilder } from './CacheKeyBuilder';
import { cacheStorage } from './CacheStorage';

/**
 * Политика кеширования по умолчанию
 */
const DEFAULT_POLICY: CachePolicy = {
    memoryLimitMB: 50,
    dbLimitMB: 500,
    defaultTTL: 3600000, // 1 час
    bucketTTL: new Map([
        [60000, 600000],        // 1 мин bucket → 10 мин TTL
        [300000, 1800000],      // 5 мин → 30 мин
        [3600000, 7200000],     // 1 час → 2 часа
        [86400000, 86400000],   // 1 день → 1 день
        [604800000, 604800000], // 1 неделя → 1 неделя
    ]),
    schemaVersion: 1
} as const;

export class CacheManager {
    private policy: CachePolicy = DEFAULT_POLICY;
    private stats: CacheStats = {
        memoryUsageMB: 0,
        dbUsageMB: 0,
        totalTiles: 0,
        hitRate: 0,
        missCount: 0,
        hitCount: 0
    };

    constructor(policy?: Partial<CachePolicy>) {
        if (policy) {
            this.policy = { ...DEFAULT_POLICY, ...policy };
        }
    }

    /**
     * Инициализация (вызвать при старте приложения)
     */
    async init(): Promise<void> {
        await cacheStorage.init();
        await this.cleanExpired();
        await this.enforceQuota();
        await this.updateStats();
    }

    /**
     * Проверить наличие tile в кеше
     */
    async lookup(
        field: FieldName,
        bucketMs: BucketsMs,
        interval: CoverageInterval
    ): Promise<CacheLookupResult> {
        const key = CacheKeyBuilder.buildTileKey(field, bucketMs, interval);

        try {
            // 1. Проверяем IndexedDB
            const cached = await cacheStorage.get(key);

            if (!cached) {
                this.stats.missCount++;
                return {
                    found: false,
                    tile: null,
                    source: 'none',
                    expired: false
                };
            }

            // 2. Проверяем TTL
            const now = Date.now();
            const expired = cached.expiresAt < now;

            if (expired) {
                // Удаляем устаревший
                await cacheStorage.delete(key);
                this.stats.missCount++;
                return {
                    found: false,
                    tile: null,
                    source: 'none',
                    expired: true
                };
            }

            // 3. Hit!
            this.stats.hitCount++;
            return {
                found: true,
                tile: cached,
                source: 'indexeddb',
                expired: false
            };

        } catch (error) {
            console.error('[CacheManager] Lookup failed:', error);
            this.stats.missCount++;
            return {
                found: false,
                tile: null,
                source: 'none',
                expired: false
            };
        }
    }

    /**
     * Сохранить tile в кеш
     */
    async save(
        field: FieldName,
        bucketMs: BucketsMs,
        interval: CoverageInterval,
        bins: readonly SeriesBinDto[],
        options?: CacheSaveOptions
    ): Promise<void> {
        const key = CacheKeyBuilder.buildTileKey(field, bucketMs, interval);
        const now = Date.now();

        // Определяем TTL
        const ttl = options?.ttlOverride
            ?? this.policy.bucketTTL.get(bucketMs)
            ?? this.policy.defaultTTL;

        // Оцениваем размер
        const size = this.estimateSize(bins);

        const cached: CachedTile = {
            key,
            field,
            bucketMs,
            interval,
            bins: [...bins],
            cachedAt: now,
            expiresAt: now + ttl,
            accessedAt: now,
            size,
            version: this.policy.schemaVersion
        };

        try {
            await cacheStorage.put(cached);
            await this.updateStats();
            await this.enforceQuota();
        } catch (error) {
            console.error('[CacheManager] Save failed:', error);
        }
    }

    /**
     * Batch сохранение tiles
     */
    async saveBatch(
        tiles: ReadonlyArray<{
            field: FieldName;
            bucketMs: BucketsMs;
            interval: CoverageInterval;
            bins: readonly SeriesBinDto[];
        }>,
        options?: CacheSaveOptions
    ): Promise<void> {
        if (tiles.length === 0) return;

        const now = Date.now();

        const cached: CachedTile[] = tiles.map(t => {
            const key = CacheKeyBuilder.buildTileKey(t.field, t.bucketMs, t.interval);
            const ttl = options?.ttlOverride
                ?? this.policy.bucketTTL.get(t.bucketMs)
                ?? this.policy.defaultTTL;
            const size = this.estimateSize(t.bins);

            return {
                key,
                field: t.field,
                bucketMs: t.bucketMs,
                interval: t.interval,
                bins: [...t.bins],
                cachedAt: now,
                expiresAt: now + ttl,
                accessedAt: now,
                size,
                version: this.policy.schemaVersion
            };
        });

        try {
            await cacheStorage.putBatch(cached);
            await this.updateStats();
            await this.enforceQuota();
        } catch (error) {
            console.error('[CacheManager] Batch save failed:', error);
        }
    }

    /**
     * Восстановить tiles из кеша (при инициализации)
     */
    async restore(field: FieldName, bucketMs: BucketsMs): Promise<readonly SeriesTile[]> {
        try {
            const cachedTiles = await cacheStorage.getByBucket(field, bucketMs);
            const now = Date.now();

            // Фильтруем устаревшие и конвертируем в SeriesTile
            const validTiles: SeriesTile[] = [];

            for (const cached of cachedTiles) {
                if (cached.expiresAt < now) {
                    await cacheStorage.delete(cached.key);
                    continue;
                }

                validTiles.push({
                    coverageInterval: cached.interval,
                    bins: [...cached.bins],
                    status: 'ready',
                    loadedAt: cached.cachedAt
                });
            }

            console.log('[CacheManager] Restored tiles:', {
                field,
                bucketMs,
                count: validTiles.length,
                source: 'indexeddb'
            });

            return validTiles;

        } catch (error) {
            console.error('[CacheManager] Restore failed:', error);
            return [];
        }
    }

    /**
     * Инвалидировать все tiles поля
     */
    async invalidateField(field: FieldName): Promise<void> {
        try {
            await cacheStorage.clearField(field);
            await this.updateStats();
            console.log('[CacheManager] Field invalidated:', field);
        } catch (error) {
            console.error('[CacheManager] Invalidation failed:', error);
        }
    }

    /**
     * Инвалидировать весь кеш
     */
    async invalidateAll(): Promise<void> {
        try {
            await cacheStorage.clearAll();
            await this.updateStats();
            console.log('[CacheManager] All cache invalidated');
        } catch (error) {
            console.error('[CacheManager] Full invalidation failed:', error);
        }
    }

    /**
     * Очистить устаревшие tiles
     */
    async cleanExpired(): Promise<void> {
        try {
            const deleted = await cacheStorage.cleanExpired();
            if (deleted > 0) {
                await this.updateStats();
                console.log('[CacheManager] Cleaned expired tiles:', deleted);
            }
        } catch (error) {
            console.error('[CacheManager] Clean expired failed:', error);
        }
    }

    /**
     * Получить статистику
     */
    getStats(): Readonly<CacheStats> {
        return { ...this.stats };
    }

    /**
     * Очистить по квоте (LRU вытеснение)
     */
    private async enforceQuota(): Promise<void> {
        try {
            const { totalSize } = await cacheStorage.getStats();
            const limitBytes = this.policy.dbLimitMB * 1024 * 1024;

            if (totalSize <= limitBytes) return;

            // Получаем все tiles, сортируем по accessedAt (LRU)
            const allFields = await this.getAllFields();
            const allTiles: CachedTile[] = [];

            for (const field of allFields) {
                const tiles = await cacheStorage.getByField(field);
                allTiles.push(...tiles);
            }

            allTiles.sort((a, b) => a.accessedAt - b.accessedAt); // старые первые

            let currentSize = totalSize;
            const toDelete: CacheKey[] = [];

            for (const tile of allTiles) {
                if (currentSize <= limitBytes) break;
                toDelete.push(tile.key);
                currentSize -= tile.size;
            }

            // Удаляем
            for (const key of toDelete) {
                await cacheStorage.delete(key);
            }

            if (toDelete.length > 0) {
                console.log('[CacheManager] Enforced quota, deleted:', toDelete.length);
                await this.updateStats();
            }

        } catch (error) {
            console.error('[CacheManager] Enforce quota failed:', error);
        }
    }

    /**
     * Обновить статистику
     */
    private async updateStats(): Promise<void> {
        try {
            const { totalSize, tileCount } = await cacheStorage.getStats();

            this.stats.dbUsageMB = totalSize / (1024 * 1024);
            this.stats.totalTiles = tileCount;

            const total = this.stats.hitCount + this.stats.missCount;
            this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;

        } catch (error) {
            console.error('[CacheManager] Update stats failed:', error);
        }
    }

    /**
     * Получить список всех полей в кеше
     */
    private async getAllFields(): Promise<readonly FieldName[]> {
        // Простой способ - через unique field из всех tiles
        // Можно оптимизировать через отдельный индекс
        const allTiles = await cacheStorage.getStats();
        // TODO: реализовать через META_STORE
        return [];
    }

    /**
     * Оценка размера bins в байтах
     */
    private estimateSize(bins: readonly SeriesBinDto[]): number {
        // Грубая оценка: каждый bin ~ 80 байт (Date + 4 числа + count)
        return bins.length * 80;
    }

    /**
     * Cleanup
     */
    dispose(): void {
        cacheStorage.dispose();
    }
}

// Singleton инстанс
export const cacheManager = new CacheManager();