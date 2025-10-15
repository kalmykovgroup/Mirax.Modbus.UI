// src/features/chartsPage/charts/orchestration/requests/RequestManager.ts

import type { AppDispatch, RootState } from '@/baseStore/store.ts';
import type { Guid } from '@app/lib/types/Guid';
import { fetchMultiSeriesData } from '../thunks/dataThunks';
import { LoadingType } from '@chartsPage/charts/core/store/types/loading.types';
import { batchUpdateTiles } from '@chartsPage/charts/core/store/chartsSlice';
import type { BucketsMs, CoverageInterval, FieldName } from '@chartsPage/charts/core/store/types/chart.types';
import { DataProcessingService } from '@chartsPage/charts/orchestration/services/DataProcessingService';
import type { GetMultiSeriesRequest } from '@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest';
import type { RequestMetrics } from '@chartsPage/charts/core/store/types/request.types.ts';
import { selectFieldView } from '@chartsPage/charts/core/store/selectors/base.selectors';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto.ts';
import { toLocalInputValue } from '@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts';

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface ActiveRequestInfo {
    readonly requestId: string;
    readonly abortController: AbortController;
    readonly promise: Promise<void>;
    readonly startTime: number;
    readonly selectedFields: readonly FieldDto[];
    readonly bucketMs: BucketsMs;
    readonly requestedInterval: CoverageInterval;
}

/**
 * Менеджер запросов для одного контекста
 * Создаётся и уничтожается вместе с контекстом
 */
export class RequestManager {
    private readonly dispatch: AppDispatch;
    private readonly getState: () => RootState;
    private readonly contextId: Guid; // ← БЫЛО: tabId

    private activeRequests: Map<string, ActiveRequestInfo>;
    private requestHistory: Map<string, number>;
    private readonly metrics: RequestMetrics;

    private readonly REQUEST_TIMEOUT_MS = 30000;
    private readonly MAX_CONCURRENT_REQUESTS = 4;
    private isDisposed: boolean;

    constructor(dispatch: AppDispatch, getState: () => RootState, contextId: Guid) {
        this.dispatch = dispatch;
        this.getState = getState;
        this.contextId = contextId;
        this.activeRequests = new Map();
        this.requestHistory = new Map();
        this.isDisposed = false;

        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cancelledRequests: 0,
            averageLoadTime: 0,
        };
    }

    /**
     * Главный метод загрузки (БЕЗ contextId - менеджер уже знает свой контекст)
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

        const timeSettings = this.getState().chartsSettings.timeSettings;

        console.log('[loadVisibleRange]', {
            contextId: this.contextId,
            field: fieldName,
            from: toLocalInputValue(from, timeSettings),
            to: toLocalInputValue(to, timeSettings),
        });

        const request = DataProcessingService.analyzeLoadNeeds(
            this.contextId,
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

        if (
            request.template.resolvedFromMs === undefined ||
            request.template.resolvedToMs === undefined
        ) {
            console.log('[RequestManager] Ошибка, диапазон не задан');
            return;
        }

        const requestId = generateId();
        const requestedInterval: CoverageInterval = {
            fromMs: request.template.resolvedFromMs,
            toMs: request.template.resolvedToMs,
        };

        const fields = request.template.selectedFields.map((f) => f.name);

        const loadingUpdates = DataProcessingService.prepareLoadingTiles({
            contextId: this.contextId,
            fields,
            bucketMs: bucketsMs,
            loadingInterval: requestedInterval,
            requestId,
            getState: this.getState,
        });

        if (loadingUpdates.length > 0) {
            this.dispatch(batchUpdateTiles({ contextId: this.contextId, updates: loadingUpdates }));
        }

        await this.executeRequest(request, bucketsMs, requestedInterval, requestId);
    }

    /**
     * Выполнение запроса
     */
    private async executeRequest(
        request: GetMultiSeriesRequest,
        bucketMs: BucketsMs,
        requestedInterval: CoverageInterval,
        requestId: string
    ): Promise<void> {
        const primaryField = request.template.selectedFields[0]?.name;
        if (!primaryField) {
            console.error('[RequestManager] No fields in request');
            return;
        }

        if (
            request.template.resolvedFromMs === undefined ||
            request.template.resolvedToMs === undefined
        ) {
            console.log('[RequestManager] Ошибка, диапазон не задан');
            return;
        }

        const requestKey = this.buildRequestKey(
            primaryField,
            bucketMs,
            request.template.resolvedFromMs,
            request.template.resolvedToMs
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

        // Очередь внутри контекста
        while (this.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS && !this.isDisposed) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (this.isDisposed) return;

        const abortController = new AbortController();
        const startTime = Date.now();

        const promise = this.performHttpRequest(request, abortController, requestId, requestedInterval)
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

        this.activeRequests.set(requestKey, {
            requestId,
            abortController,
            promise,
            startTime,
            selectedFields: request.template.selectedFields,
            bucketMs,
            requestedInterval,
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
        _requestId: string,
        requestedInterval: CoverageInterval
    ): Promise<void> {
        const timeoutId = setTimeout(() => {
            console.warn('[RequestManager] Timeout');
            abortController.abort();
        }, this.REQUEST_TIMEOUT_MS);

        try {
            const result = await this.dispatch(
                fetchMultiSeriesData({
                    data: {
                        request,
                        fields: request.template.selectedFields,
                        loadingType: LoadingType.Zoom,
                        signal: abortController.signal,
                    },
                    contextId: this.contextId // ← БЫЛО: tabId
                })
            ).unwrap();

            clearTimeout(timeoutId);

            if (result.wasAborted) {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                throw error;
            }

            DataProcessingService.processServerResponse({
                contextId: this.contextId, // ← БЫЛО: tabId
                response: result.response,
                bucketMs: request.bucketMs!,
                requestedInterval,
                dispatch: this.dispatch,
                getState: this.getState,
            });
        } catch (error: unknown) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Отмена запросов для поля
     */
    cancelFieldRequests(fieldName: FieldName): void {
        let cancelled = 0;
        const tilesToRemove: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            requestId: string;
        }> = [];

        for (const [key, request] of this.activeRequests.entries()) {
            const hasField = request.selectedFields.some((f) => f.name === fieldName);

            if (hasField) {
                request.abortController.abort();

                for (const field of request.selectedFields) {
                    tilesToRemove.push({
                        field: field.name,
                        bucketMs: request.bucketMs,
                        requestId: request.requestId,
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
                contextId: this.contextId, // ← БЫЛО: tabId
                triggerField: fieldName,
                requestsCancelled: cancelled,
            });
        }
    }

    /**
     * Удаление loading тайлов
     */
    private removeLoadingTiles(
        tilesToRemove: Array<{ field: FieldName; bucketMs: BucketsMs; requestId: string }>
    ): void {
        const updates: Array<{
            field: FieldName;
            bucketMs: BucketsMs;
            tiles: any[];
        }> = [];

        const requestIds = new Set(tilesToRemove.map((t) => t.requestId));

        for (const { field: fieldName, bucketMs } of tilesToRemove) {
            const view = selectFieldView(this.getState(), this.contextId, fieldName); // ← БЫЛО: tabId
            if (!view) continue;

            const tiles = view.seriesLevel[bucketMs];
            if (!tiles) continue;

            const filteredTiles = tiles.filter(
                (t) => !(t.status === 'loading' && t.requestId && requestIds.has(t.requestId))
            );

            if (filteredTiles.length !== tiles.length) {
                updates.push({
                    field: fieldName,
                    bucketMs,
                    tiles: filteredTiles,
                });
            }
        }

        if (updates.length > 0) {
            this.dispatch(batchUpdateTiles({ contextId: this.contextId, updates })); // ← БЫЛО: tabId
        }
    }

    /**
     * Построение ключа запроса
     */
    private buildRequestKey(
        fieldName: FieldName,
        bucketMs: BucketsMs,
        from: number,
        to: number
    ): string {
        return `${fieldName}:${bucketMs}:${from}:${to}`;
    }

    /**
     * Обновление средней длительности загрузки
     */
    private updateAverageLoadTime(loadTime: number): void {
        const { successfulRequests, averageLoadTime } = this.metrics;
        this.metrics.averageLoadTime =
            (averageLoadTime * (successfulRequests - 1) + loadTime) / successfulRequests;
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
                contextId: this.contextId, // ← БЫЛО: tabId
                cleared,
                remaining: this.requestHistory.size,
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
     * Получение contextId
     */
    getContextId(): Guid { // ← БЫЛО: getTabId()
        return this.contextId;
    }

    /**
     * Очистка ресурсов
     */
    dispose(): void {
        if (this.isDisposed) return;

        console.log('[RequestManager] Disposing...', {
            contextId: this.contextId, // ← БЫЛО: tabId
            activeRequests: this.activeRequests.size,
        });

        this.isDisposed = true;

        for (const request of this.activeRequests.values()) {
            request.abortController.abort();
        }

        this.activeRequests.clear();
        this.requestHistory.clear();
    }
}