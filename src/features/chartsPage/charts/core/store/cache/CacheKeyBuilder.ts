// @chartsPage/charts/cache/utils/CacheKeyBuilder.ts

import type { BucketsMs, CoverageInterval, FieldName } from '@chartsPage/charts/core/store/types/chart.types';
import type { CacheKey } from '../types/cache.types';

export class CacheKeyBuilder {
    /**
     * Генерация ключа для tile
     * Формат: {field}:{bucket}:{fromMs}:{toMs}
     */
    static buildTileKey(
        field: FieldName,
        bucketMs: BucketsMs,
        interval: CoverageInterval
    ): CacheKey {
        return `${field}:${bucketMs}:${interval.fromMs}:${interval.toMs}`;
    }

    /**
     * Разбор ключа обратно в компоненты
     */
    static parseTileKey(key: CacheKey): {
        field: FieldName;
        bucketMs: BucketsMs;
        fromMs: number;
        toMs: number;
    } | null {
        const parts = key.split(':');
        if (parts.length !== 4) return null;

        const [field, bucketStr, fromStr, toStr] = parts;
        if (!field || !bucketStr || !fromStr || !toStr) return null;

        const bucketMs = Number(bucketStr);
        const fromMs = Number(fromStr);
        const toMs = Number(toStr);

        if (!Number.isFinite(bucketMs) || !Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
            return null;
        }

        return { field, bucketMs, fromMs, toMs };
    }

    /**
     * Генерация префикса для поиска всех tiles поля
     */
    static buildFieldPrefix(field: FieldName): string {
        return `${field}:`;
    }

    /**
     * Генерация префикса для поиска tiles конкретного bucket
     */
    static buildBucketPrefix(field: FieldName, bucketMs: BucketsMs): string {
        return `${field}:${bucketMs}:`;
    }
}