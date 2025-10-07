// orchestration/requests/RequestManager.ts

import type { AppDispatch, RootState } from '@/store/store';
import { fetchMultiSeriesData } from '../thunks/dataThunks';
import { LoadingType } from '@chartsPage/charts/core/store/types/loading.types';
import { batchUpdateTiles } from '@chartsPage/charts/core/store/chartsSlice';
import type {
    BucketsMs,
    CoverageInterval,
    FieldName
} from "@chartsPage/charts/core/store/types/chart.types";
import { DataProcessingService } from "@chartsPage/charts/orchestration/services/DataProcessingService";
import type { GetMultiSeriesRequest } from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest";
import type { RequestMetrics } from "@chartsPage/charts/core/store/types/request.types.ts";
import { selectFieldView } from "@chartsPage/charts/core/store/selectors/base.selectors";
import type { FieldDto } from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import {TileSystemCore} from "@chartsPage/charts/core/store/tile-system/TileSystemCore.ts";

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

//   ИСПРАВЛЕНО: Храним selectedFields из template
interface ActiveRequestInfo {
    readonly requestId: string;
    readonly abortController: AbortController;
    readonly promise: Promise<void>;
    readonly startTime: number;
    readonly selectedFields: readonly FieldDto[]; // ← Из request.template.selectedFields
    readonly bucketMs: BucketsMs;
    readonly requestedInterval: CoverageInterval;
}

export class RequestManager {
    private readonly dispatch: AppDispatch;
    private readonly getState: () => RootState;

    private activeRequests: Map<string, ActiveRequestInfo>;
    private requestHistory: Map<string, number>;
    private readonly metrics: RequestMetrics;

    private readonly REQUEST_TIMEOUT_MS = 30000;
    private readonly MAX_CONCURRENT_REQUESTS = 6;
    private isDisposed: boolean;

    constructor(dispatch: AppDispatch, getState: () => RootState) {
        this.dispatch = dispatch;
        this.getState = getState;
        this.activeRequests = new Map();
        this.requestHistory = new Map();
        this.isDisposed = false;

        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cancelledRequests: 0,
            averageLoadTime: 0
        };
    }

    /**
     * Главный метод загрузки
     */
    /**
     *    ОПТИМИЗАЦИЯ: Ранний выход если данные уже есть
     */
    async loadVisibleRange(
        fieldName: FieldName,
        from: number,
        to: number,
        bucketsMs: number,
        px: number
    ): Promise<void> {
        if (this.isDisposed) {
            console.warn('[RequestManager] Disposed');
            return;
        }

        // РАННЯЯ ПРОВЕРКА COVERAGE - до вызова analyzeLoadNeeds
        const state = this.getState();
        const fieldView = selectFieldView(state, fieldName);

        if (fieldView && fieldView.originalRange) {
            const tiles = fieldView.seriesLevel[bucketsMs] ?? [];
            const alignedFrom = Math.floor(from / bucketsMs) * bucketsMs;
            const alignedTo = Math.ceil(to / bucketsMs) * bucketsMs;

            const quickCheck = TileSystemCore.findGaps(
                fieldView.originalRange,
                tiles,
                { fromMs: alignedFrom, toMs: alignedTo }
            );

            if (quickCheck.hasFull || quickCheck.coverage >= 99.9) {
                console.log('[RequestManager]    Full coverage, instant display');
                return;
            }

            console.log('[RequestManager] Partial coverage:', {
                coverage: quickCheck.coverage.toFixed(1) + '%',
                gaps: quickCheck.gaps.length
            });
        }

        const request = DataProcessingService.analyzeLoadNeeds(
            fieldName,
            from,
            to,
            bucketsMs,
            px,
            this.getState
        );

        if (request === false) {
            console.log('[RequestManager] No load needed');
            return;
        }

        const requestId = generateId();
        const requestedInterval: CoverageInterval = {
            fromMs: request.from!.getTime(),
            toMs: request.to!.getTime()
        };

        const fields = request.template.selectedFields.map(f => f.name);

        const loadingUpdates = DataProcessingService.prepareLoadingTiles({
            fields,
            bucketMs: bucketsMs,
            loadingInterval: requestedInterval,
            requestId,
            getState: this.getState
        });

        if (loadingUpdates.length > 0) {
            this.dispatch(batchUpdateTiles(loadingUpdates));
        }

        await this.executeRequest(
            request,
            bucketsMs,
            requestedInterval,
            requestId
        );
    }

    /**
     *   ИСПРАВЛЕНО: executeRequest принимает request целиком
     */
    private async executeRequest(
        request: GetMultiSeriesRequest,
        bucketMs: BucketsMs,
        requestedInterval: CoverageInterval,
        requestId: string
    ): Promise<void> {
        //   Ключ по первому полю из request.template.selectedFields
        const primaryField = request.template.selectedFields[0]?.name;
        if (!primaryField) {
            console.error('[RequestManager] No fields in request');
            return;
        }

        const requestKey = this.buildRequestKey(
            primaryField,
            bucketMs,
            request.from!,
            request.to!
        );

        if (this.activeRequests.has(requestKey)) {
            console.log('[RequestManager] Duplicate request');
            return;
        }

        const lastTime = this.requestHistory.get(requestKey);
        if (lastTime && Date.now() - lastTime < 1000) {
            console.log('[RequestManager] Debounced');
            return;
        }

        while (this.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS && !this.isDisposed) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.isDisposed) return;

        const abortController = new AbortController();
        const startTime = Date.now();

        const promise = this.performHttpRequest(
            request,
            abortController,
            requestId,
            requestedInterval
        )
            .then(() => {
                this.requestHistory.set(requestKey, Date.now());
                this.metrics.successfulRequests++;
                this.updateAverageLoadTime(Date.now() - startTime);
            })
            .catch((error: unknown) => {
                const isAborted =
                    (error instanceof Error && error.name === 'AbortError') ||
                    abortController.signal.aborted;

                if (isAborted) {
                    this.metrics.cancelledRequests++;
                    console.log('[RequestManager] Request cancelled:', requestKey);
                } else {
                    this.metrics.failedRequests++;
                    console.error('[RequestManager] Request failed:', error);
                    throw error;
                }
            })
            .finally(() => {
                this.activeRequests.delete(requestKey);
            });

        //   Сохраняем selectedFields из request.template
        this.activeRequests.set(requestKey, {
            requestId,
            abortController,
            promise,
            startTime,
            selectedFields: request.template.selectedFields, // ← Из template
            bucketMs,
            requestedInterval
        });

        this.metrics.totalRequests++;

        await promise;
    }

    /**
     * HTTP запрос через thunk
     */
    private async performHttpRequest(
        request: GetMultiSeriesRequest,
        abortController: AbortController,
        requestId: string,
        requestedInterval: CoverageInterval
    ): Promise<void> {
        console.log('[RequestManager] HTTP request:', {
            requestId,
            fields: request.template.selectedFields.map(f => f.name),
            from: request.from?.toISOString(),
            to: request.to?.toISOString()
        });

        const timeoutId = setTimeout(() => {
            console.warn('[RequestManager] Timeout');
            abortController.abort();
        }, this.REQUEST_TIMEOUT_MS);

        try {
            const result = await this.dispatch(
                fetchMultiSeriesData({
                    request,
                    fields: request.template.selectedFields,
                    loadingType: LoadingType.Zoom,
                    signal: abortController.signal
                })
            ).unwrap();

            clearTimeout(timeoutId);

            if (result.wasAborted) {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                throw error;
            }

            DataProcessingService.processServerResponse({
                response: result.response,
                bucketMs: request.bucketMs!,
                requestedInterval,
                dispatch: this.dispatch,
                getState: this.getState
            });

            console.log('[RequestManager] Complete:', requestId);

        } catch (error: unknown) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     *   ИСПРАВЛЕНО: Проверяем request.selectedFields
     */
    cancelFieldRequests(fieldName: FieldName): void {
        let cancelled = 0;
        const tilesToRemove: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            requestId: string;
        }> = [];

        for (const [key, request] of this.activeRequests.entries()) {
            //   Проверяем если fieldName есть в request.selectedFields
            const hasField = request.selectedFields.some(f => f.name === fieldName);

            if (hasField) {
                request.abortController.abort();

                //   Собираем loading тайлы для ВСЕХ полей из request.selectedFields
                for (const field of request.selectedFields) {
                    tilesToRemove.push({
                        field: field.name,
                        bucketMs: request.bucketMs,
                        requestId: request.requestId
                    });
                }

                this.activeRequests.delete(key);
                cancelled++;
            }
        }

        if (cancelled > 0) {
            this.metrics.cancelledRequests += cancelled;
            this.removeLoadingTiles(tilesToRemove);

            console.log('[RequestManager] Cancelled requests:', {
                triggerField: fieldName,
                requestsCancelled: cancelled,
                affectedFields: [...new Set(tilesToRemove.map(t => t.field))]
            });
        }
    }

    /**
     *   Удаление loading тайлов
     */
    private removeLoadingTiles(
        requests: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            requestId: string;
        }>
    ): void {
        if (requests.length === 0) return;

        const state = this.getState();
        const updates: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            tiles: any[];
        }> = [];

        // Группируем по field + bucketMs
        const grouped = new Map<string, Set<string>>();

        for (const req of requests) {
            const key = `${req.field}:${req.bucketMs}`;
            const requestIds = grouped.get(key) ?? new Set();
            requestIds.add(req.requestId);
            grouped.set(key, requestIds);
        }

        for (const [key, requestIds] of grouped.entries()) {
            const [fieldName, bucketMsStr] = key.split(':');
            if (!fieldName || !bucketMsStr) continue;

            const bucketMs = Number(bucketMsStr);
            const fieldView = selectFieldView(state, fieldName);
            if (!fieldView) continue;

            const tiles = fieldView.seriesLevel[bucketMs];
            if (!tiles) continue;

            // Фильтруем loading тайлы с этими requestId
            const filteredTiles = tiles.filter(
                t => !(t.status === 'loading' && t.requestId && requestIds.has(t.requestId))
            );

            if (filteredTiles.length !== tiles.length) {
                updates.push({
                    field: fieldName,
                    bucketMs,
                    tiles: filteredTiles
                });

                console.log('[removeLoadingTiles] Removed loading tiles:', {
                    field: fieldName,
                    bucketMs,
                    requestIds: Array.from(requestIds),
                    removedCount: tiles.length - filteredTiles.length
                });
            }
        }

        if (updates.length > 0) {
            this.dispatch(batchUpdateTiles(updates));
        }
    }

    /**
     *   Отмена запросов кроме указанного bucket
     */
    cancelFieldRequestsExceptBucket(fieldName: FieldName, keepBucket: BucketsMs): void {
        let cancelled = 0;
        const tilesToRemove: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            requestId: string;
        }> = [];

        for (const [key, request] of this.activeRequests.entries()) {
            const hasField = request.selectedFields.some(f => f.name === fieldName);

            if (hasField && request.bucketMs !== keepBucket) {
                request.abortController.abort();

                for (const field of request.selectedFields) {
                    tilesToRemove.push({
                        field: field.name,
                        bucketMs: request.bucketMs,
                        requestId: request.requestId
                    });
                }

                this.activeRequests.delete(key);
                cancelled++;
            }
        }

        if (cancelled > 0) {
            this.metrics.cancelledRequests += cancelled;
            this.removeLoadingTiles(tilesToRemove);

            console.log('[RequestManager] Cancelled old bucket requests:', {
                field: fieldName,
                keepBucket,
                requestsCancelled: cancelled
            });
        }
    }

    /**
     * Очистка старой истории
     */
    clearOldHistory(maxAge: number = 60000): void {
        if (this.isDisposed) return;

        const now = Date.now();
        let cleared = 0;

        for (const [key, timestamp] of this.requestHistory.entries()) {
            if (now - timestamp > maxAge) {
                this.requestHistory.delete(key);
                cleared++;
            }
        }

        if (cleared > 0) {
            console.log('[RequestManager] Cleared old history:', {
                cleared,
                remaining: this.requestHistory.size
            });
        }
    }

    /**
     * Получение метрик
     */
    getMetrics(): Readonly<RequestMetrics> {
        return { ...this.metrics };
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        if (this.isDisposed) return;

        console.log('[RequestManager] Disposing...', {
            activeRequests: this.activeRequests.size,
            historySize: this.requestHistory.size
        });

        this.isDisposed = true;

        const allTilesToRemove: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            requestId: string;
        }> = [];

        for (const request of this.activeRequests.values()) {
            request.abortController.abort();

            for (const field of request.selectedFields) {
                allTilesToRemove.push({
                    field: field.name,
                    bucketMs: request.bucketMs,
                    requestId: request.requestId
                });
            }
        }

        this.removeLoadingTiles(allTilesToRemove);
        this.activeRequests.clear();
        this.requestHistory.clear();
    }

    // ============================================
    // ПРИВАТНЫЕ УТИЛИТЫ
    // ============================================

    private buildRequestKey(
        field: FieldName,
        bucketMs: BucketsMs,
        from: Date,
        to: Date
    ): string {
        return `${field}:${bucketMs}:${from.getTime()}:${to.getTime()}`;
    }

    private updateAverageLoadTime(loadTime: number): void {
        const total = this.metrics.successfulRequests;
        if (total === 1) {
            this.metrics.averageLoadTime = loadTime;
        } else {
            this.metrics.averageLoadTime =
                (this.metrics.averageLoadTime * (total - 1) + loadTime) / total;
        }
    }
}