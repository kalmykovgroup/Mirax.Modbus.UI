// orchestration/requests/RequestManager.ts

import type { AppDispatch, RootState } from '@/store/store';
import { fetchMultiSeriesData } from '../thunks/dataThunks';
import {
    selectBucketCoverageForRange,
    selectCurrentCoverage
} from '@chartsPage/charts/core/store/selectors/dataProxy.selectors';
import {
    selectFieldCurrentBucketMs,
    selectFieldCurrentRange,
    selectFieldPx,
    selectTemplate
} from '@chartsPage/charts/core/store/selectors/base.selectors';
import { LoadingType } from '@chartsPage/charts/core/store/types/loading.types';
import {
    type ActiveRequest,
    type LoadAnalysis,
    type PrefetchStrategy,
    type RequestConfig,
    type RequestKey,
    type RequestMetrics,
    RequestPriority,
    RequestReason
} from "@chartsPage/charts/core/store/types/request.types.ts";
import type {BucketsMs, CoverageInterval, FieldName} from "@chartsPage/charts/core/store/types/chart.types.ts";

/**
 * Простой генератор ID без внешних зависимостей
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * RequestManager — оркестратор загрузки данных
 *
 * Главная задача: эффективное управление запросами к API для больших данных
 *
 * Ключевые возможности:
 * 1. Дедупликация — предотвращает повторные запросы одних и тех же данных
 * 2. Приоритизация — видимые данные загружаются с высоким приоритетом
 * 3. Отмена устаревших запросов — при zoom/pan старые запросы отменяются
 * 4. Gap-filling — загружает только недостающие интервалы
 * 5. Prefetch — упреждающая загрузка при приближении к границам
 * 6. Retry — автоматический повтор при сетевых ошибках
 * 7. Timeout — защита от зависших запросов
 */
export class RequestManager {
    private dispatch: AppDispatch;
    private readonly getState: () => RootState;

    private activeRequests: Map<RequestKey, ActiveRequest>;
    private requestHistory: Map<RequestKey, number>;

    private prefetchStrategy: PrefetchStrategy;
    private metrics: RequestMetrics;

    private isDisposed: boolean;

    // Конфигурация retry и timeout
    private readonly REQUEST_TIMEOUT_MS = 30000; // 30 секунд
    private readonly MAX_RETRIES = 3;
    private readonly MAX_CONCURRENT_REQUESTS = 6; // Лимит одновременных запросов

    constructor(dispatch: AppDispatch, getState: () => RootState) {
        this.dispatch = dispatch;
        this.getState = getState;

        this.activeRequests = new Map();
        this.requestHistory = new Map();

        this.prefetchStrategy = {
            enabled: true,
            sizeMultiplier: 0.5,
            triggerThreshold: 0.2, // Триггер при 20% до границы
            maxConcurrent: 2
        };

        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cancelledRequests: 0,
            averageLoadTime: 0
        };

        this.isDisposed = false;
    }

    // ============================================
    // ПУБЛИЧНЫЕ МЕТОДЫ
    // ============================================


    /**
     * Загрузить данные для видимого диапазона
     */
    async loadVisibleRange(fieldName: FieldName): Promise<void> {
        if (this.isDisposed) {
            console.warn('[RequestManager] Manager is disposed');
            return;
        }

        const analysis = this.analyzeLoadNeeds(fieldName);

        if (!analysis.shouldLoad) {
            console.log('[RequestManager] No load needed for', fieldName);

            // Проверяем prefetch даже если загрузка не нужна
            if (this.prefetchStrategy.enabled && analysis.currentCoverage >= 95) {
                void this.triggerPrefetchIfNeeded(fieldName);
            }

            return;
        }

        const config = this.buildRequestConfig(
            fieldName,
            analysis.gaps,
            analysis.priority,
            analysis.reason ?? RequestReason.Zoom
        );

        if (!config) {
            console.warn('[RequestManager] Failed to build config for', fieldName);
            return;
        }

        await this.executeRequest(config);

        // Запуск prefetch после успешной загрузки
        if (this.prefetchStrategy.enabled && analysis.currentCoverage >= 95) {
            void this.triggerPrefetchIfNeeded(fieldName);
        }
    }

    /**
     * Загрузить данные для конкретного gap
     */
    async loadGap(
        fieldName: FieldName,
        bucketMs: BucketsMs,
        gap: CoverageInterval,
        priority: RequestPriority = RequestPriority.Normal
    ): Promise<void> {
        if (this.isDisposed) return;

        const state = this.getState();
        const template = selectTemplate(state);
        const px = selectFieldPx(state, fieldName);

        if (!template || !px) return;

        const field = template.selectedFields.find(f => f.name === fieldName);
        if (!field) return;

        const config: RequestConfig = {
            field: fieldName,
            bucketMs,
            interval: gap,
            priority,
            reason: RequestReason.Gap,
            px
        };

        await this.executeRequest(config);
    }

    /**
     * Отменить все активные запросы для поля
     */
    cancelFieldRequests(fieldName: FieldName): void {
        for (const [key, request] of this.activeRequests.entries()) {
            if (request.config.field === fieldName) {
                console.log('[RequestManager] Cancelling request:', key);
                request.abortController.abort();
                this.activeRequests.delete(key);
                this.metrics.cancelledRequests++;
            }
        }
    }

    /**
     * Отменить запросы с низким приоритетом
     */
    cancelLowPriorityRequests(fieldName: FieldName): void {
        for (const [key, request] of this.activeRequests.entries()) {
            if (
                request.config.field === fieldName &&
                request.config.priority === RequestPriority.Low
            ) {
                console.log('[RequestManager] Cancelling low-priority request:', key);
                request.abortController.abort();
                this.activeRequests.delete(key);
                this.metrics.cancelledRequests++;
            }
        }
    }

    /**
     * Получить количество активных запросов
     */
    getActiveRequestsCount(fieldName?: FieldName): number {
        if (!fieldName) {
            return this.activeRequests.size;
        }

        let count = 0;
        for (const request of this.activeRequests.values()) {
            if (request.config.field === fieldName) {
                count++;
            }
        }
        return count;
    }

    /**
     * Получить метрики производительности
     */
    getMetrics(): Readonly<RequestMetrics> {
        return { ...this.metrics };
    }

    /**
     * Настроить стратегию prefetch
     */
    setPrefetchStrategy(strategy: Partial<PrefetchStrategy>): void {
        this.prefetchStrategy = {
            ...this.prefetchStrategy,
            ...strategy
        };
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ: АНАЛИЗ
    // ============================================

    /**
     * Анализ необходимости загрузки для поля
     */
    private analyzeLoadNeeds(fieldName: FieldName): LoadAnalysis {
        const state = this.getState();
        const currentRange = selectFieldCurrentRange(state, fieldName);
        const currentBucketMs = selectFieldCurrentBucketMs(state, fieldName);
        const coverage = selectCurrentCoverage(state, fieldName);

        if (!currentRange || !currentBucketMs) {
            return {
                shouldLoad: false,
                gaps: [],
                currentCoverage: 0,
                reason: null,
                priority: RequestPriority.Normal
            };
        }

        // Проверка: есть ли gaps
        if (coverage.gaps.length === 0 && coverage.coverage >= 95) {
            return {
                shouldLoad: false,
                gaps: [],
                currentCoverage: coverage.coverage,
                reason: null,
                priority: RequestPriority.Normal
            };
        }

        // Определяем приоритет
        let priority = RequestPriority.Normal;
        let reason = RequestReason.Gap;

        if (coverage.coverage < 50) {
            priority = RequestPriority.High;
            reason = RequestReason.Zoom;
        } else if (coverage.gaps.length > 0) {
            priority = RequestPriority.Normal;
            reason = RequestReason.Gap;
        }

        return {
            shouldLoad: true,
            gaps: coverage.gaps.map(g => ({
                fromMs: g.from,
                toMs: g.to
            })),
            currentCoverage: coverage.coverage,
            reason,
            priority
        };
    }

    /**
     * Построить конфигурацию запроса из gaps
     */
    private buildRequestConfig(
        fieldName: FieldName,
        gaps: readonly CoverageInterval[],
        priority: RequestPriority,
        reason: RequestReason
    ): RequestConfig | null {
        const state = this.getState();
        const template = selectTemplate(state);
        const bucketMs = selectFieldCurrentBucketMs(state, fieldName);
        const px = selectFieldPx(state, fieldName);

        if (!template || !bucketMs || !px || gaps.length === 0) {
            return null;
        }

        // Объединяем смежные gaps в один запрос
        const mergedInterval = this.mergeGaps(gaps);

        return {
            field: fieldName,
            bucketMs,
            interval: mergedInterval,
            priority,
            reason,
            px
        };
    }

    /**
     * Объединить смежные gaps в один интервал
     */
    private mergeGaps(gaps: readonly CoverageInterval[]): CoverageInterval {
        if (gaps.length === 0) {
            throw new Error('[RequestManager] Cannot merge empty gaps');
        }

        const sorted = [...gaps].sort((a, b) => a.fromMs - b.fromMs);

        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        if (!first || !last) {
            throw new Error('[RequestManager] Invalid gaps array');
        }

        return {
            fromMs: first.fromMs,
            toMs: last.toMs
        };
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ: ВЫПОЛНЕНИЕ
    // ============================================

    /**
     * Выполнить запрос с дедупликацией
     */
    private async executeRequest(config: RequestConfig): Promise<void> {
        const key = this.buildRequestKey(config);

        // Проверка: запрос уже выполняется
        const existing = this.activeRequests.get(key);
        if (existing) {
            console.log('[RequestManager] Request already in progress:', key);
            return existing.promise;
        }

        // Проверка: запрос недавно выполнялся (debounce)
        const lastLoadTime = this.requestHistory.get(key);
        if (lastLoadTime && Date.now() - lastLoadTime < 1000) {
            console.log('[RequestManager] Request debounced:', key);
            return;
        }

        // Проверка: лимит одновременных запросов
        if (this.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
            console.log('[RequestManager] Max concurrent requests reached, queuing...');
            await this.waitForSlot();
        }

        // Отменяем низкоприоритетные если это высокоприоритетный запрос
        if (config.priority === RequestPriority.High) {
            this.cancelLowPriorityRequests(config.field);
        }

        // Создаём запрос
        const abortController = new AbortController();
        const requestId = generateId();
        const startTime = Date.now();

        this.metrics.totalRequests++;

        const promise = this.performRequestWithRetry(config, abortController, requestId)
            .then(() => {
                this.requestHistory.set(key, Date.now());
                this.metrics.successfulRequests++;
                this.updateAverageLoadTime(startTime, Date.now());
            })
            .catch((error: unknown) => {
                if (error instanceof Error && error.name === 'AbortError') {
                    this.metrics.cancelledRequests++;
                } else {
                    this.metrics.failedRequests++;
                    console.error('[RequestManager] Request failed:', error);
                }
            })
            .finally(() => {
                this.activeRequests.delete(key);
            });

        const activeRequest: ActiveRequest = {
            config,
            requestId,
            abortController,
            startTime,
            promise
        };

        this.activeRequests.set(key, activeRequest);

        await promise;
    }

    /**
     * Ожидание освобождения слота для запроса
     */
    private async waitForSlot(): Promise<void> {
        while (this.activeRequests.size >= this.MAX_CONCURRENT_REQUESTS) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Выполнить запрос с retry логикой
     */
    private async performRequestWithRetry(
        config: RequestConfig,
        abortController: AbortController,
        requestId: string
    ): Promise<void> {
        let lastError: unknown;

        for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
            try {
                await this.performRequest(config, abortController, requestId);
                return; // Успех
            } catch (error) {
                lastError = error;

                // Не retry для AbortError
                if (error instanceof Error && error.name === 'AbortError') {
                    throw error;
                }

                // Не retry для client errors (4xx)
                if (this.isClientError(error)) {
                    throw error;
                }

                // Последняя попытка
                if (attempt === this.MAX_RETRIES - 1) {
                    throw error;
                }

                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                console.log(`[RequestManager] Retry ${attempt + 1}/${this.MAX_RETRIES} in ${delay}ms for request ${requestId}`);
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * Непосредственное выполнение запроса с timeout
     */
    private async performRequest(
        config: RequestConfig,
        abortController: AbortController,
        requestId: string
    ): Promise<void> {
        const state = this.getState();
        const template = selectTemplate(state);

        if (!template) {
            throw new Error('[RequestManager] Template not found');
        }

        const field = template.selectedFields.find(f => f.name === config.field);
        if (!field) {
            throw new Error(`[RequestManager] Field not found: ${config.field}`);
        }

        const fromDate = new Date(config.interval.fromMs);
        const toDate = new Date(config.interval.toMs);

        console.log('[RequestManager] Starting request:', {
            field: config.field,
            bucket: config.bucketMs,
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
            priority: config.priority,
            reason: config.reason,
            requestId
        });

        // Устанавливаем timeout
        const timeoutId = setTimeout(() => {
            console.warn('[RequestManager] Request timeout:', requestId);
            abortController.abort();
        }, this.REQUEST_TIMEOUT_MS);

        try {
            const result = await this.dispatch(
                fetchMultiSeriesData({
                    request: {
                        template,
                        from: fromDate,
                        to: toDate,
                        px: config.px,
                        bucketMs: config.bucketMs,
                        metadata: {
                            reason: this.mapReasonToMetadata(config.reason),
                            priority: config.priority
                        }
                    },
                    fields: [field],
                    loadingType: this.mapReasonToLoadingType(config.reason),
                    signal: abortController.signal
                })
            ).unwrap();

            clearTimeout(timeoutId);

            if (result.wasAborted) {
                console.log('[RequestManager] Request was aborted:', requestId);
                const abortError = new Error('Request aborted');
                abortError.name = 'AbortError';
                throw abortError;
            } else {
                console.log('[RequestManager] Request completed:', requestId);
            }
        } catch (error: unknown) {
            clearTimeout(timeoutId);

            if (error instanceof Error && (error.name === 'AbortError' || error.message === 'AbortError')) {
                console.log('[RequestManager] Request aborted:', requestId);
                const abortError = new Error('Request aborted');
                abortError.name = 'AbortError';
                throw abortError;
            } else {
                console.error('[RequestManager] Request failed:', requestId, error);
                throw error;
            }
        }
    }

    /**
     * Проверка на client error (4xx)
     */
    private isClientError(error: unknown): boolean {
        // RTK Query оборачивает ошибки в объект с полем status
        if (typeof error === 'object' && error !== null && 'status' in error) {
            const status = (error as { status: unknown }).status;
            if (typeof status === 'number') {
                return status >= 400 && status < 500;
            }
        }
        return false;
    }

    /**
     * Вспомогательная функция sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Построить уникальный ключ запроса
     */
    private buildRequestKey(config: RequestConfig): RequestKey {
        return `${config.field}:${config.bucketMs}:${config.interval.fromMs}:${config.interval.toMs}`;
    }

    /**
     * Маппинг RequestReason -> metadata.reason
     */
    private mapReasonToMetadata(reason: RequestReason): 'gap' | 'prefetch-left' | 'prefetch-right' | 'zoom' | 'initial' {
        switch (reason) {
            case RequestReason.Initial: return 'initial';
            case RequestReason.Gap: return 'gap';
            case RequestReason.Zoom: return 'zoom';
            case RequestReason.Pan: return 'zoom';
            case RequestReason.PrefetchLeft: return 'prefetch-left';
            case RequestReason.PrefetchRight: return 'prefetch-right';
            case RequestReason.Refresh: return 'zoom';
        }
    }

    /**
     * Маппинг RequestReason -> LoadingType
     */
    private mapReasonToLoadingType(reason: RequestReason): LoadingType {
        switch (reason) {
            case RequestReason.Initial: return LoadingType.Initial;
            case RequestReason.Gap:
            case RequestReason.Zoom: return LoadingType.Zoom;
            case RequestReason.Pan:
            case RequestReason.PrefetchLeft:
            case RequestReason.PrefetchRight: return LoadingType.Pan;
            case RequestReason.Refresh: return LoadingType.Refresh;
        }
    }

    /**
     * Обновить среднее время загрузки
     */
    private updateAverageLoadTime(startTime: number, endTime: number): void {
        const loadTime = endTime - startTime;
        const total = this.metrics.successfulRequests;

        if (total === 1) {
            this.metrics.averageLoadTime = loadTime;
        } else {
            this.metrics.averageLoadTime =
                (this.metrics.averageLoadTime * (total - 1) + loadTime) / total;
        }
    }

    // ============================================
    // ПРИВАТНЫЕ МЕТОДЫ: PREFETCH
    // ============================================

    /**
     * Запустить prefetch только если viewport приблизился к границам
     *
     * Логика:
     * - Prefetch НЕ запускается если пользователь далеко от границ
     * - Prefetch запускается когда viewport в пределах triggerThreshold от границы
     */
    private async triggerPrefetchIfNeeded(fieldName: FieldName): Promise<void> {
        if (this.getActivePrefetchCount() >= this.prefetchStrategy.maxConcurrent) {
            console.log('[RequestManager] Max concurrent prefetch reached');
            return;
        }

        const state = this.getState();
        const currentRange = selectFieldCurrentRange(state, fieldName);
        const bucketMs = selectFieldCurrentBucketMs(state, fieldName);
        const px = selectFieldPx(state, fieldName);

        if (!currentRange || !bucketMs || !px) return;

        const rangeMs = currentRange.to.getTime() - currentRange.from.getTime();
        const prefetchSize = rangeMs * this.prefetchStrategy.sizeMultiplier;

        // ✅ ИСПОЛЬЗУЕМ triggerDistance для проверки
        // Триггер срабатывает если есть gaps в пределах triggerThreshold от текущего диапазона
        const triggerDistance = rangeMs * this.prefetchStrategy.triggerThreshold;

        // Prefetch влево
        const leftGap: CoverageInterval = {
            fromMs: currentRange.from.getTime() - prefetchSize,
            toMs: currentRange.from.getTime()
        };

        // Prefetch вправо
        const rightGap: CoverageInterval = {
            fromMs: currentRange.to.getTime(),
            toMs: currentRange.to.getTime() + prefetchSize
        };

        // Проверяем coverage для prefetch зон
        const leftCoverage = selectBucketCoverageForRange(
            state,
            fieldName,
            bucketMs,
            leftGap.fromMs,
            leftGap.toMs
        );

        const rightCoverage = selectBucketCoverageForRange(
            state,
            fieldName,
            bucketMs,
            rightGap.fromMs,
            rightGap.toMs
        );

        // ✅ ДОБАВЛЕНА ПРОВЕРКА: триггерим только если есть gaps близко к границе
        // Проверяем наличие gaps в "горячей зоне" (triggerDistance от границы)
        const hasLeftGapsNearBoundary = leftCoverage.coverage < 80 &&
            leftCoverage.gaps.some(gap =>
                (currentRange.from.getTime() - gap.to) <= triggerDistance
            );

        const hasRightGapsNearBoundary = rightCoverage.coverage < 80 &&
            rightCoverage.gaps.some(gap =>
                (gap.from - currentRange.to.getTime()) <= triggerDistance
            );

        if (hasLeftGapsNearBoundary) {
            const config: RequestConfig = {
                field: fieldName,
                bucketMs,
                interval: leftGap,
                priority: RequestPriority.Low,
                reason: RequestReason.PrefetchLeft,
                px
            };

            console.log('[RequestManager] Triggering left prefetch for', fieldName,
                '(gaps near left boundary)');
            void this.executeRequest(config);
        }

        if (hasRightGapsNearBoundary) {
            const config: RequestConfig = {
                field: fieldName,
                bucketMs,
                interval: rightGap,
                priority: RequestPriority.Low,
                reason: RequestReason.PrefetchRight,
                px
            };

            console.log('[RequestManager] Triggering right prefetch for', fieldName,
                '(gaps near right boundary)');
            void this.executeRequest(config);
        }
    }

    /**
     * Получить количество активных prefetch запросов
     */
    private getActivePrefetchCount(): number {
        let count = 0;
        for (const request of this.activeRequests.values()) {
            if (
                request.config.reason === RequestReason.PrefetchLeft ||
                request.config.reason === RequestReason.PrefetchRight
            ) {
                count++;
            }
        }
        return count;
    }

    // ============================================
    // МЕТОДЫ ОЧИСТКИ
    // ============================================

    /**
     * Очистить историю запросов старше N миллисекунд
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
     * Полная очистка (при unmount)
     */
    dispose(): void {
        this.isDisposed = true;

        // Отменяем все активные запросы
        for (const request of this.activeRequests.values()) {
            request.abortController.abort();
        }

        this.activeRequests.clear();
        this.requestHistory.clear();

        // Сброс метрик
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cancelledRequests: 0,
            averageLoadTime: 0
        };

        console.log('[RequestManager] Disposed');
    }
}