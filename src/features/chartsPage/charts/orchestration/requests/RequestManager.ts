// orchestration/requests/RequestManager.ts

import type {AppDispatch, RootState} from '@/store/store';
import { fetchMultiSeriesData } from '../thunks/dataThunks';
import { LoadingType } from '@chartsPage/charts/core/store/types/loading.types';
import {
    type ActiveRequest,
    type RequestKey,
    type RequestMetrics,
    RequestPriority,
    RequestReason
} from "@chartsPage/charts/core/store/types/request.types";
import type {
    BucketsMs, CoverageInterval,
    FieldName
} from "@chartsPage/charts/core/store/types/chart.types";
import { DataProcessingService } from "@chartsPage/charts/orchestration/services/DataProcessingService";
import type { GetMultiSeriesRequest } from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest";

// ============================================
// УТИЛИТЫ
// ============================================

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// КЛАСС
// ============================================

export class RequestManager {
    private readonly dispatch: AppDispatch;
    private readonly getState: () => RootState;

    private activeRequests: Map<RequestKey, ActiveRequest>;
    private requestHistory: Map<RequestKey, number>;
    private readonly metrics: RequestMetrics;
    private isDisposed: boolean;

    private readonly REQUEST_TIMEOUT_MS = 30000;
    private readonly MAX_CONCURRENT_REQUESTS = 6;

    constructor(dispatch: AppDispatch, getState: () => RootState) {
        this.dispatch = dispatch;
        this.getState = getState;
        this.activeRequests = new Map();
        this.requestHistory = new Map();

        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cancelledRequests: 0,
            averageLoadTime: 0
        };

        this.isDisposed = false;
    }

    /**
     * Главный метод - получает только базовые параметры от UI
     */
    async loadVisibleRange(
        fieldName: FieldName,
        from: number,
        to: number,
        bucketsMs: number,
        px: number
    ): Promise<void> {
        if (this.isDisposed) {
            console.warn('[RequestManager] Manager is disposed');
            return;
        }

        const requestOrFalse = DataProcessingService.analyzeLoadNeeds(
            fieldName,
            from,
            to,
            bucketsMs,
            px,
            this.getState
        );

        if (requestOrFalse === false) {
            console.log('[RequestManager] No load needed');
            return;
        }

        // Подготовка loading tiles
        const requestId = generateId();
        const requestedInterval = {
            fromMs: requestOrFalse.from!.getTime(),
            toMs: requestOrFalse.to!.getTime()
        };

        DataProcessingService.prepareLoadingTiles({
            field: fieldName,
            bucketMs: bucketsMs,
            loadingInterval: requestedInterval,
            requestId,
            dispatch: this.dispatch,
            getState: this.getState
        });

        // Выполнение запроса
        await this.executeRequest(
            requestOrFalse,
            fieldName,
            bucketsMs,
            requestedInterval
        );
    }
    /**
     * Выполнить запрос
     */
    private async executeRequest(
        request: GetMultiSeriesRequest,
        fieldName: FieldName,
        bucketMs: BucketsMs,
        requestedInterval: CoverageInterval
    ): Promise<void> {
        const requestKey = this.buildRequestKey(
            fieldName,
            bucketMs,
            request.from!,
            request.to!
        );

        // Проверка дубликатов
        const existing = this.activeRequests.get(requestKey);
        if (existing) {
            console.log('[RequestManager] Request already active');
            return existing.promise;
        }

        // Проверка debounce
        const lastTime = this.requestHistory.get(requestKey);
        if (lastTime && Date.now() - lastTime < 1000) {
            console.log('[RequestManager] Request debounced');
            return;
        }

        // Ждём слот если очередь полная
        while (this.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS && !this.isDisposed) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (this.isDisposed) return;

        const abortController = new AbortController();
        const requestId = generateId();
        const startTime = Date.now();

        const promise = this.performHttpRequest(request, abortController, requestId, requestedInterval)
            .then(() => {
                if (this.isDisposed) return;

                this.requestHistory.set(requestKey, Date.now());
                this.metrics.successfulRequests++;
                this.updateAverageLoadTime(Date.now() - startTime);
            })
            .catch((error: unknown) => {
                if (this.isDisposed) return;

                if (error instanceof Error && error.name === 'AbortError') {
                    this.metrics.cancelledRequests++;
                } else {
                    this.metrics.failedRequests++;
                    console.error('[RequestManager] Request failed:', error);
                }
                throw error;
            })
            .finally(() => {
                this.activeRequests.delete(requestKey);
            });

        const activeRequest: ActiveRequest = {
            config: {
                field: fieldName,
                bucketMs,
                interval: {
                    fromMs: request.from!.getTime(),
                    toMs: request.to!.getTime()
                },
                priority: RequestPriority.Normal,
                reason: RequestReason.Zoom,
                px: request.px
            },
            requestId,
            abortController,
            startTime,
            promise
        };

        this.activeRequests.set(requestKey, activeRequest);
        this.metrics.totalRequests++;

        await promise;
    }

    /**
     * Выполнить HTTP запрос через thunk
     */
    private async performHttpRequest(
        request: GetMultiSeriesRequest,
        abortController: AbortController,
        requestId: string,
        requestedInterval: CoverageInterval // ДОБАВЛЕНО
    ): Promise<void> {
        console.log('[RequestManager] Performing HTTP request:', {
            requestId,
            from: request.from?.toISOString(),
            to: request.to?.toISOString(),
            bucketMs: request.bucketMs
        });

        const timeoutId = setTimeout(() => {
            console.warn('[RequestManager] Request timeout');
            abortController.abort();
        }, this.REQUEST_TIMEOUT_MS);

        try {
            const field = request.template.selectedFields[0];
            if (!field) {
                throw new Error('[RequestManager] No field in request');
            }

            // HTTP запрос через thunk
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
                const error = new Error('Request aborted');
                error.name = 'AbortError';
                throw error;
            }

            // ✅ ДОБАВЛЕНО: Обработка ответа от сервера
            const state = this.getState();

            // Обрабатываем все поля из ответа
            for (const selectedField of request.template.selectedFields) {
                const fieldView = state.charts.view[selectedField.name];

                if (!fieldView || !request.bucketMs) {
                    console.warn('[RequestManager] Missing view for field:', selectedField.name);
                    continue;
                }

                const tiles = fieldView.seriesLevel[request.bucketMs] ?? [];

                DataProcessingService.processServerResponse({
                    response: result.response,
                    bucketMs: request.bucketMs,
                    requestedInterval: requestedInterval,
                    tiles: tiles,
                    field: selectedField.name,
                    dispatch: this.dispatch
                });

                console.log('[RequestManager] Processed response for field:', selectedField.name);
            }

            console.log('[RequestManager] Request completed:', requestId);

        } catch (error: unknown) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Отменить все запросы для поля
     */
    cancelFieldRequests(fieldName: FieldName): void {
        let count = 0;

        for (const [key, request] of this.activeRequests.entries()) {
            if (request.config.field === fieldName) {
                console.log('[RequestManager] Cancelling request:', key);
                request.abortController.abort();
                this.activeRequests.delete(key);
                count++;
            }
        }

        this.metrics.cancelledRequests += count;
    }

    /**
     * Отменить запросы кроме указанного bucket
     */
    cancelFieldRequestsExceptBucket(fieldName: FieldName, keepBucket: BucketsMs): void {
        let count = 0;

        for (const [key, request] of this.activeRequests.entries()) {
            if (request.config.field === fieldName && request.config.bucketMs !== keepBucket) {
                console.log('[RequestManager] Cancelling old bucket request:', key);
                request.abortController.abort();
                this.activeRequests.delete(key);
                count++;
            }
        }

        this.metrics.cancelledRequests += count;
    }

    /**
     * Получить метрики
     */
    getMetrics(): Readonly<RequestMetrics> {
        return { ...this.metrics };
    }

    /**
     * Очистить историю
     */
    clearOldHistory(maxAge: number = 60000): void {
        const now = Date.now();
        for (const [key, timestamp] of this.requestHistory.entries()) {
            if (now - timestamp > maxAge) {
                this.requestHistory.delete(key);
            }
        }
    }

    /**
     * Освободить ресурсы
     */
    dispose(): void {
        if (this.isDisposed) return;

        console.log('[RequestManager] Disposing...');
        this.isDisposed = true;

        for (const request of this.activeRequests.values()) {
            request.abortController.abort();
        }

        this.activeRequests.clear();
        this.requestHistory.clear();
    }

    // ============================================
    // ПРИВАТНЫЕ УТИЛИТЫ
    // ============================================

    private buildRequestKey(field: FieldName, bucketMs: BucketsMs, from: Date, to: Date): RequestKey {
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