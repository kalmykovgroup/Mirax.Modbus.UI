// @chartsPage/charts/cache/storage/CacheStorage.ts

import type { CachedTile, CacheFieldMeta, CacheKey } from '../types/cache.types'; 
import type { FieldName, BucketsMs } from '@chartsPage/charts/core/store/types/chart.types';

const DB_NAME = 'ChartsCache';
const DB_VERSION = 1;
const TILES_STORE = 'tiles';
const META_STORE = 'meta';

export class CacheStorage {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Инициализация IndexedDB
     */
    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Store для tiles
                if (!db.objectStoreNames.contains(TILES_STORE)) {
                    const tilesStore = db.createObjectStore(TILES_STORE, { keyPath: 'key' });
                    tilesStore.createIndex('field', 'field', { unique: false });
                    tilesStore.createIndex('bucketMs', 'bucketMs', { unique: false });
                    tilesStore.createIndex('expiresAt', 'expiresAt', { unique: false });
                    tilesStore.createIndex('accessedAt', 'accessedAt', { unique: false });
                }

                // Store для метаданных
                if (!db.objectStoreNames.contains(META_STORE)) {
                    db.createObjectStore(META_STORE, { keyPath: 'field' });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Получить tile из кеша
     */
    async get(key: CacheKey): Promise<CachedTile | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE], 'readonly');
            const store = transaction.objectStore(TILES_STORE);
            const request = store.get(key);

            request.onsuccess = () => {
                const tile = request.result as CachedTile | undefined;
                resolve(tile ?? null);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get tile: ${key}`));
            };
        });
    }

    /**
     * Сохранить tile в кеш (с обновлением accessedAt)
     */
    async put(tile: CachedTile): Promise<void> {
        await this.init();
        if (!this.db) return;

        const updatedTile: CachedTile = {
            ...tile,
            accessedAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE, META_STORE], 'readwrite');
            const tilesStore = transaction.objectStore(TILES_STORE);
            const metaStore = transaction.objectStore(META_STORE);

            // Сохраняем tile
            const putRequest = tilesStore.put(updatedTile);

            putRequest.onsuccess = () => {
                // Обновляем метаданные поля
                this.updateFieldMeta(metaStore, tile.field).then(resolve).catch(reject);
            };

            putRequest.onerror = () => {
                reject(new Error(`Failed to put tile: ${tile.key}`));
            };
        });
    }

    /**
     * Batch сохранение tiles
     */
    async putBatch(tiles: readonly CachedTile[]): Promise<void> {
        await this.init();
        if (!this.db || tiles.length === 0) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE, META_STORE], 'readwrite');
            const tilesStore = transaction.objectStore(TILES_STORE);
            const metaStore = transaction.objectStore(META_STORE);

            let completed = 0;
            const now = Date.now();

            for (const tile of tiles) {
                const updatedTile: CachedTile = { ...tile, accessedAt: now };
                const request = tilesStore.put(updatedTile);

                request.onsuccess = () => {
                    completed++;
                    if (completed === tiles.length) {
                        // Обновляем метаданные для всех затронутых полей
                        const fields = new Set(tiles.map(t => t.field));
                        Promise.all(
                            Array.from(fields).map(f => this.updateFieldMeta(metaStore, f))
                        ).then(() => resolve()).catch(reject);
                    }
                };

                request.onerror = () => {
                    reject(new Error(`Failed to put tile in batch: ${tile.key}`));
                };
            }
        });
    }

    /**
     * Удалить tile
     */
    async delete(key: CacheKey): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE], 'readwrite');
            const store = transaction.objectStore(TILES_STORE);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to delete tile: ${key}`));
        });
    }

    /**
     * Получить все tiles для поля
     */
    async getByField(field: FieldName): Promise<readonly CachedTile[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE], 'readonly');
            const store = transaction.objectStore(TILES_STORE);
            const index = store.index('field');
            const request = index.getAll(field);

            request.onsuccess = () => {
                resolve(request.result as CachedTile[]);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get tiles for field: ${field}`));
            };
        });
    }

    /**
     * Получить все tiles для конкретного bucket поля
     */
    async getByBucket(field: FieldName, bucketMs: BucketsMs): Promise<readonly CachedTile[]> {
        const allTiles = await this.getByField(field);
        return allTiles.filter(t => t.bucketMs === bucketMs);
    }

    /**
     * Очистить устаревшие tiles (TTL истёк)
     */
    async cleanExpired(): Promise<number> {
        await this.init();
        if (!this.db) return 0;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE], 'readwrite');
            const store = transaction.objectStore(TILES_STORE);
            const index = store.index('expiresAt');
            const now = Date.now();
            const range = IDBKeyRange.upperBound(now);
            const request = index.openCursor(range);

            let deleted = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
                if (cursor) {
                    cursor.delete();
                    deleted++;
                    cursor.continue();
                } else {
                    resolve(deleted);
                }
            };

            request.onerror = () => {
                reject(new Error('Failed to clean expired tiles'));
            };
        });
    }

    /**
     * Очистить все tiles поля
     */
    async clearField(field: FieldName): Promise<void> {
        await this.init();
        if (!this.db) return;

        const tiles = await this.getByField(field);

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE, META_STORE], 'readwrite');
            const tilesStore = transaction.objectStore(TILES_STORE);
            const metaStore = transaction.objectStore(META_STORE);

            let completed = 0;

            for (const tile of tiles) {
                const request = tilesStore.delete(tile.key);
                request.onsuccess = () => {
                    completed++;
                    if (completed === tiles.length) {
                        metaStore.delete(field);
                        resolve();
                    }
                };
                request.onerror = () => {
                    reject(new Error(`Failed to clear field: ${field}`));
                };
            }

            if (tiles.length === 0) {
                metaStore.delete(field);
                resolve();
            }
        });
    }

    /**
     * Очистить весь кеш
     */
    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE, META_STORE], 'readwrite');
            const tilesRequest = transaction.objectStore(TILES_STORE).clear();
            const metaRequest = transaction.objectStore(META_STORE).clear();

            let completed = 0;
            const onSuccess = () => {
                completed++;
                if (completed === 2) resolve();
            };

            tilesRequest.onsuccess = onSuccess;
            metaRequest.onsuccess = onSuccess;

            tilesRequest.onerror = () => reject(new Error('Failed to clear tiles store'));
            metaRequest.onerror = () => reject(new Error('Failed to clear meta store'));
        });
    }

    /**
     * Получить статистику использования
     */
    async getStats(): Promise<{ totalSize: number; tileCount: number }> {
        await this.init();
        if (!this.db) return { totalSize: 0, tileCount: 0 };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([TILES_STORE], 'readonly');
            const store = transaction.objectStore(TILES_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                const tiles = request.result as CachedTile[];
                const totalSize = tiles.reduce((sum, t) => sum + t.size, 0);
                resolve({ totalSize, tileCount: tiles.length });
            };

            request.onerror = () => {
                reject(new Error('Failed to get cache stats'));
            };
        });
    }

    /**
     * Приватный метод: обновление метаданных поля
     */
    private async updateFieldMeta(
        metaStore: IDBObjectStore,
        field: FieldName
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const tilesStore = metaStore.transaction.objectStore(TILES_STORE);
            const index = tilesStore.index('field');
            const request = index.getAll(field);

            request.onsuccess = () => {
                const tiles = request.result as CachedTile[];

                if (tiles.length === 0) {
                    metaStore.delete(field);
                    resolve();
                    return;
                }

                const buckets = new Set<BucketsMs>();
                let totalSize = 0;

                for (const tile of tiles) {
                    buckets.add(tile.bucketMs);
                    totalSize += tile.size;
                }

                const meta: CacheFieldMeta = {
                    field,
                    buckets: Array.from(buckets).sort((a, b) => a - b),
                    totalSize,
                    tileCount: tiles.length,
                    lastAccess: Date.now()
                };

                const putRequest = metaStore.put(meta);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(new Error(`Failed to update meta for: ${field}`));
            };

            request.onerror = () => {
                reject(new Error(`Failed to get tiles for meta update: ${field}`));
            };
        });
    }

    /**
     * Cleanup при размонтировании
     */
    dispose(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.initPromise = null;
    }
}

// Singleton инстанс
export const cacheStorage = new CacheStorage();