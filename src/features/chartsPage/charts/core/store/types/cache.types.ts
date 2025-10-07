// @chartsPage/charts/cache/types/cache.types.ts

import type { SeriesBinDto } from '@chartsPage/charts/core/dtos/SeriesBinDto';
import type { BucketsMs, CoverageInterval, FieldName } from '@chartsPage/charts/core/store/types/chart.types';

/**
 * Уникальный ключ для кеша tile
 * Формат: {field}:{bucket}:{fromMs}:{toMs}
 */
export type CacheKey = string;

/**
 * Закешированный tile в IndexedDB
 */
export interface CachedTile {
    readonly key: CacheKey;
    readonly field: FieldName;
    readonly bucketMs: BucketsMs;
    readonly interval: CoverageInterval;
    readonly bins: SeriesBinDto[];
    readonly cachedAt: number; // timestamp кеширования
    readonly expiresAt: number; // TTL
    readonly accessedAt: number; // для LRU
    readonly size: number; // размер в байтах (примерный)
    readonly version: number; // версия схемы
}

/**
 * Метаданные кеша для поля
 */
export interface CacheFieldMeta {
    readonly field: FieldName;
    readonly buckets: readonly BucketsMs[]; // доступные buckets
    readonly totalSize: number; // общий размер в байтах
    readonly tileCount: number;
    readonly lastAccess: number;
}

/**
 * Политика кеширования
 */
export interface CachePolicy {
    /** Максимальный размер в памяти (Redux) в МБ */
    readonly memoryLimitMB: number;
    /** Максимальный размер в IndexedDB в МБ */
    readonly dbLimitMB: number;
    /** TTL по умолчанию в мс */
    readonly defaultTTL: number;
    /** TTL в зависимости от размера bucket */
    readonly bucketTTL: ReadonlyMap<BucketsMs, number>;
    /** Версия схемы (для инвалидации при изменениях) */
    readonly schemaVersion: number;
}

/**
 * Статистика кеша
 */
export interface CacheStats {
    readonly memoryUsageMB: number;
    readonly dbUsageMB: number;
    readonly totalTiles: number;
    readonly hitRate: number; // 0-1
    readonly missCount: number;
    readonly hitCount: number;
}

/**
 * Результат проверки кеша
 */
export interface CacheLookupResult {
    readonly found: boolean;
    readonly tile: CachedTile | null;
    readonly source: 'memory' | 'indexeddb' | 'none';
    readonly expired: boolean;
}

/**
 * Опции сохранения в кеш
 */
export interface CacheSaveOptions {
    readonly priority?: 'high' | 'normal' | 'low' | undefined;
    readonly ttlOverride?: number | undefined;
}