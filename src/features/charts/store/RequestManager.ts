// src/charts/store/RequestManager.ts

import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto';

/**
 * Информация о запросе
 */
export interface RequestInfo {
    id: string;
    fieldName: string;
    bucketMs: number;
    abortController: AbortController;
    promise: Promise<any>;
    startTime: number;
    estimatedDuration: number;
    progress: number;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'failed';
    retryCount: number;
    error?: string;
}

/**
 * Конфигурация запроса
 */
export interface RequestConfig {
    field: FieldDto;
    bucketMs: number;
    from: Date;
    to: Date;
    px: number;
    onProgress?: (progress: number) => void;
    onStatusChange?: (status: RequestInfo['status']) => void;
}

/**
 * Опции выполнения запроса
 */
export interface ExecuteOptions {
    skipDebounce?: boolean;
    maxRetries?: number;
    priority?: 'high' | 'normal' | 'low';
}

/**
 * Отложенный запрос
 */
interface DebouncedRequest {
    timeoutId: NodeJS.Timeout;
    config: RequestConfig;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    priority: ExecuteOptions['priority'];
    createdAt: number;
}

/**
 * История зума для анализа скорости
 */
interface ZoomHistoryEntry {
    time: number;
    bucketMs: number;
    range: { from: number; to: number };
}

/**
 * Менеджер для управления запросами графиков
 */
class RequestManager {
    // Хранилища
    private activeRequests = new Map<string, RequestInfo>();
    private debouncedRequests = new Map<string, DebouncedRequest>();
    private requestHistory = new Map<string, number[]>(); // История длительностей
    private zoomHistory = new Map<string, ZoomHistoryEntry[]>();
    private failureCount = new Map<string, number>();

    // Настройки
    private readonly MAX_CONCURRENT_REQUESTS = 3;
    private readonly MAX_RETRIES = 2;
    private readonly RETRY_DELAY_MS = 1000;

    // Настройки debouncing
    private readonly FAST_DEBOUNCE = 100;
    private readonly NORMAL_DEBOUNCE = 400;
    private readonly SLOW_DEBOUNCE = 800;
    private readonly ZOOM_VELOCITY_THRESHOLD = 0.5;
    private readonly HISTORY_WINDOW_MS = 1000;
    private readonly MAX_HISTORY_SIZE = 50;

    // Настройки прогресса
    private readonly PROGRESS_CHECK_INTERVAL = 100;
    private readonly CANCEL_THRESHOLD_PERCENT = 70;

    // Singleton
    private static instance: RequestManager;

    private constructor() {
        // Очистка старых записей каждую минуту
        setInterval(() => this.cleanupOldData(), 60000);
    }

    public static getInstance(): RequestManager {
        if (!RequestManager.instance) {
            RequestManager.instance = new RequestManager();
        }
        return RequestManager.instance;
    }

    /**
     * Генерирует уникальный ключ для запроса
     */
    private getRequestKey(fieldName: string, bucketMs: number): string {
        return `${fieldName}_${bucketMs}`;
    }

    /**
     * Генерирует уникальный ID запроса
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Анализирует скорость зума и определяет оптимальную задержку
     */
    private analyzeZoomVelocity(fieldName: string, bucketMs: number, range: { from: Date; to: Date }): {
        isZooming: boolean;
        velocity: number;
        debounceTime: number;
        confidence: number;
    } {
        const now = Date.now();
        const history = this.zoomHistory.get(fieldName) || [];

        // Добавляем текущую запись
        const newEntry: ZoomHistoryEntry = {
            time: now,
            bucketMs,
            range: { from: range.from.getTime(), to: range.to.getTime() }
        };
        history.push(newEntry);

        // Оставляем только последние записи в окне времени
        const recentHistory = history.filter(h => now - h.time <= this.HISTORY_WINDOW_MS);

        // Ограничиваем размер истории
        if (recentHistory.length > this.MAX_HISTORY_SIZE) {
            recentHistory.splice(0, recentHistory.length - this.MAX_HISTORY_SIZE);
        }

        this.zoomHistory.set(fieldName, recentHistory);

        // Недостаточно данных для анализа
        if (recentHistory.length < 2) {
            return {
                isZooming: false,
                velocity: 0,
                debounceTime: this.NORMAL_DEBOUNCE,
                confidence: 0
            };
        }

        // Вычисляем скорость изменения
        const timeSpan = now - recentHistory[0]!.time;
        const changes = recentHistory.length - 1;
        const velocity = timeSpan > 0 ? (changes / timeSpan) * 1000 : 0;

        // Анализируем паттерн изменений bucket
        const bucketChanges = new Set(recentHistory.map(h => h.bucketMs)).size;
        const rangeChanges = this.calculateRangeChangeRate(recentHistory);

        // Определяем уверенность в анализе (0-1)
        const confidence = Math.min(1, recentHistory.length / 10);

        // Проверяем активность зума
        const lastChangeTime = recentHistory.length > 1
            ? now - recentHistory[recentHistory.length - 2]!.time
            : Infinity;
        const isZooming = lastChangeTime < 300 && velocity > this.ZOOM_VELOCITY_THRESHOLD;

        // Адаптивная задержка на основе комплексного анализа
        let debounceTime: number;
        if (velocity > 10 || bucketChanges > 3) {
            // Очень быстрый зум или частая смена уровней
            debounceTime = this.FAST_DEBOUNCE;
        } else if (velocity > 3 || rangeChanges > 0.5) {
            // Средняя скорость
            debounceTime = this.NORMAL_DEBOUNCE;
        } else if (velocity > this.ZOOM_VELOCITY_THRESHOLD) {
            // Медленный зум
            debounceTime = this.NORMAL_DEBOUNCE * 1.5;
        } else {
            // Зум остановился
            debounceTime = this.SLOW_DEBOUNCE;
        }

        // Корректировка на основе уверенности
        if (confidence < 0.5) {
            debounceTime = Math.max(debounceTime, this.NORMAL_DEBOUNCE);
        }

        console.log(`[RequestManager] Zoom analysis for ${fieldName}:`, {
            velocity: velocity.toFixed(2),
            isZooming,
            debounceTime,
            confidence: (confidence * 100).toFixed(0) + '%',
            bucketChanges,
            rangeChanges: rangeChanges.toFixed(2)
        });

        return { isZooming, velocity, debounceTime, confidence };
    }

    /**
     * Вычисляет скорость изменения диапазона
     */
    private calculateRangeChangeRate(history: ZoomHistoryEntry[]): number {
        if (history.length < 2) return 0;

        let totalChange = 0;
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1]!;
            const curr = history[i]!;
            const prevRange = prev.range.to - prev.range.from;
            const currRange = curr.range.to - curr.range.from;
            const change = Math.abs(currRange - prevRange) / Math.max(prevRange, 1);
            totalChange += change;
        }

        return totalChange / (history.length - 1);
    }

    /**
     * Оценивает время выполнения запроса
     */
    private estimateRequestDuration(key: string): number {
        const history = this.requestHistory.get(key) || [];
        if (history.length === 0) return 2000;

        // Используем медиану для устойчивости к выбросам
        const sorted = [...history].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] || 2000;

        // Добавляем 20% запаса
        return Math.min(10000, median * 1.2);
    }

    /**
     * Сохраняет длительность запроса в историю
     */
    private saveRequestDuration(key: string, duration: number): void {
        const history = this.requestHistory.get(key) || [];
        history.push(duration);

        // Храним только последние 10 записей
        if (history.length > 10) {
            history.shift();
        }

        this.requestHistory.set(key, history);
    }

    /**
     * Проверяет, можно ли отменить запрос
     */
    private shouldCancelRequest(request: RequestInfo): boolean {
        const now = Date.now();
        const elapsedTime = now - request.startTime;
        const progressPercent = (elapsedTime / request.estimatedDuration) * 100;

        // Не отменяем если:
        // 1. Запрос почти завершен
        if (request.progress > this.CANCEL_THRESHOLD_PERCENT) {
            console.log(`[RequestManager] Request ${request.id} is ${request.progress}% complete, not cancelling`);
            return false;
        }

        // 2. Прошло слишком много времени (вероятно скоро завершится)
        if (progressPercent > this.CANCEL_THRESHOLD_PERCENT) {
            console.log(`[RequestManager] Request ${request.id} time progress ${progressPercent.toFixed(1)}%, not cancelling`);
            return false;
        }

        // 3. Это повторная попытка после ошибки
        if (request.retryCount > 0) {
            console.log(`[RequestManager] Request ${request.id} is retry attempt ${request.retryCount}, not cancelling`);
            return false;
        }

        return true;
    }

    /**
     * Отменяет конкретный запрос
     */
    public cancelRequest(fieldName: string, bucketMs: number): boolean {
        const key = this.getRequestKey(fieldName, bucketMs);

        // Отменяем отложенный запрос
        const debouncedReq = this.debouncedRequests.get(key);
        if (debouncedReq) {
            clearTimeout(debouncedReq.timeoutId);
            debouncedReq.reject(new DOMException('Cancelled', 'AbortError'));
            this.debouncedRequests.delete(key);
            console.log(`[RequestManager] Cancelled debounced request for ${key}`);
            return true;
        }

        // Отменяем активный запрос
        const activeReq = this.activeRequests.get(key);
        if (!activeReq) {
            return false;
        }

        if (activeReq.status === 'completed' || activeReq.status === 'cancelled') {
            return false;
        }

        if (!this.shouldCancelRequest(activeReq)) {
            return false;
        }

        // Выполняем отмену
        activeReq.abortController.abort();
        activeReq.status = 'cancelled';
        this.activeRequests.delete(key);

        console.log(`[RequestManager] Cancelled active request ${activeReq.id}`);
        return true;
    }

    /**
     * Отменяет все запросы для поля
     */
    public cancelFieldRequests(fieldName: string, exceptBucketMs?: number): number {
        let cancelledCount = 0;

        // Отменяем отложенные запросы
        for (const [key, debouncedReq] of this.debouncedRequests) {
            if (key.startsWith(`${fieldName}_`)) {
                const bucketMs = parseInt(key.split('_')[1] || '0');
                if (exceptBucketMs === undefined || bucketMs !== exceptBucketMs) {
                    clearTimeout(debouncedReq.timeoutId);
                    debouncedReq.reject(new DOMException('Cancelled', 'AbortError'));
                    this.debouncedRequests.delete(key);
                    cancelledCount++;
                }
            }
        }

        // Отменяем активные запросы
        for (const [key, activeReq] of this.activeRequests) {
            if (activeReq.fieldName === fieldName) {
                const bucketMs = activeReq.bucketMs;
                if (exceptBucketMs === undefined || bucketMs !== exceptBucketMs) {
                    if (this.cancelRequest(fieldName, bucketMs)) {
                        cancelledCount++;
                    }
                }
            }
        }

        if (cancelledCount > 0) {
            console.log(`[RequestManager] Cancelled ${cancelledCount} requests for field ${fieldName}`);
        }

        return cancelledCount;
    }

    /**
     * Основной метод выполнения запроса
     */
    public async executeRequest<T>(
        config: RequestConfig,
        requestFn: (signal: AbortSignal) => Promise<T>,
        options: ExecuteOptions = {}
    ): Promise<T> {
        const fieldName = config.field.name;
        const key = this.getRequestKey(fieldName, config.bucketMs);

        // Проверяем существующий активный запрос
        const existingRequest = this.activeRequests.get(key);
        if (existingRequest && existingRequest.status === 'in-progress') {
            console.log(`[RequestManager] Reusing existing request for ${key}`);
            return existingRequest.promise as Promise<T>;
        }

        // Немедленное выполнение если skipDebounce
        if (options.skipDebounce) {
            return this.executeImmediately(config, requestFn, options);
        }

        // Анализ зума и определение задержки
        const zoomAnalysis = this.analyzeZoomVelocity(
            fieldName,
            config.bucketMs,
            { from: config.from, to: config.to }
        );

        // Отменяем другие запросы для этого поля
        this.cancelFieldRequests(fieldName, config.bucketMs);

        // Создаем отложенный запрос
        return new Promise<T>((resolve, reject) => {
            const priority = options.priority || 'normal';
            const debounceTime = zoomAnalysis.debounceTime;

            const timeoutId = setTimeout(async () => {
                const debouncedReq = this.debouncedRequests.get(key);
                if (!debouncedReq) {
                    reject(new DOMException('Request was cancelled', 'AbortError'));
                    return;
                }

                this.debouncedRequests.delete(key);

                try {
                    const result = await this.executeImmediately(config, requestFn, options);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, debounceTime);

            // Сохраняем отложенный запрос
            this.debouncedRequests.set(key, {
                timeoutId,
                config,
                resolve: resolve as any,
                reject,
                priority,
                createdAt: Date.now()
            });

            console.log(`[RequestManager] Debounced request for ${key} (${debounceTime}ms, priority: ${priority})`);
        });
    }

    /**
     * Немедленное выполнение запроса
     */
    private async executeImmediately<T>(
        config: RequestConfig,
        requestFn: (signal: AbortSignal) => Promise<T>,
        options: ExecuteOptions = {}
    ): Promise<T> {
        const fieldName = config.field.name;
        const key = this.getRequestKey(fieldName, config.bucketMs);
        const maxRetries = options.maxRetries ?? this.MAX_RETRIES;

        let lastError: any;

        // Попытки выполнения с retry
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                // Задержка перед повторной попыткой
                await this.delay(this.RETRY_DELAY_MS * attempt);
                console.log(`[RequestManager] Retry attempt ${attempt} for ${key}`);
            }

            try {
                return await this.executeSingleRequest(config, requestFn, attempt);
            } catch (error: any) {
                lastError = error;

                // Не повторяем при отмене
                if (error.name === 'AbortError') {
                    throw error;
                }

                // Не повторяем при критических ошибках
                if (error.status === 400 || error.status === 401 || error.status === 403) {
                    throw error;
                }

                console.error(`[RequestManager] Request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
            }
        }

        // Все попытки исчерпаны
        this.failureCount.set(key, (this.failureCount.get(key) || 0) + 1);
        throw lastError;
    }

    /**
     * Выполнение одной попытки запроса
     */
    private async executeSingleRequest<T>(
        config: RequestConfig,
        requestFn: (signal: AbortSignal) => Promise<T>,
        retryCount: number
    ): Promise<T> {
        const fieldName = config.field.name;
        const key = this.getRequestKey(fieldName, config.bucketMs);

        // Ждем если слишком много параллельных запросов
        await this.waitForSlot();

        const abortController = new AbortController();
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        const requestInfo: RequestInfo = {
            id: requestId,
            fieldName,
            bucketMs: config.bucketMs,
            abortController,
            promise: null as any,
            startTime,
            estimatedDuration: this.estimateRequestDuration(key),
            progress: 0,
            status: 'pending',
            retryCount,
            error: undefined
        };

        // Оборачиваем с отслеживанием прогресса
        const promise = this.wrapWithProgress(
            requestFn(abortController.signal),
            requestInfo,
            config.onProgress
        );

        requestInfo.promise = promise;
        this.activeRequests.set(key, requestInfo);

        // Уведомляем об изменении статуса
        config.onStatusChange?.('in-progress');
        requestInfo.status = 'in-progress';

        try {
            const result = await promise;

            // Сохраняем успешную длительность
            const duration = Date.now() - startTime;
            this.saveRequestDuration(key, duration);

            requestInfo.status = 'completed';
            requestInfo.progress = 100;
            config.onStatusChange?.('completed');

            // Сбрасываем счетчик ошибок при успехе
            this.failureCount.delete(key);

            console.log(`[RequestManager] Request ${requestId} completed in ${duration}ms`);
            return result as T;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                requestInfo.status = 'cancelled';
                config.onStatusChange?.('cancelled');
                console.log(`[RequestManager] Request ${requestId} was cancelled`);
            } else {
                requestInfo.status = 'failed';
                requestInfo.error = error.message;
                config.onStatusChange?.('failed');
                console.error(`[RequestManager] Request ${requestId} failed:`, error);
            }
            throw error;

        } finally {
            // Удаляем запрос после небольшой задержки
            setTimeout(() => {
                if (this.activeRequests.get(key)?.id === requestId) {
                    this.activeRequests.delete(key);
                }
            }, 100);
        }
    }

    /**
     * Ожидание свободного слота для запроса
     */
    private async waitForSlot(): Promise<void> {
        while (this.getActiveRequestCount() >= this.MAX_CONCURRENT_REQUESTS) {
            await this.delay(50);
        }
    }

    /**
     * Оборачивает промис для отслеживания прогресса
     */
    private async wrapWithProgress<T>(
        promise: Promise<T>,
        requestInfo: RequestInfo,
        onProgress?: (progress: number) => void
    ): Promise<T> {
        const startTime = Date.now();
        let progressTimer: NodeJS.Timeout | undefined;

        // Запускаем отслеживание прогресса
        progressTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const estimatedProgress = Math.min(90, (elapsed / requestInfo.estimatedDuration) * 100);

            // Используем максимум между оценочным и реальным прогрессом
            const progress = Math.max(requestInfo.progress, estimatedProgress);
            requestInfo.progress = progress;
            onProgress?.(progress);
        }, this.PROGRESS_CHECK_INTERVAL);

        try {
            const result = await promise;

            // Завершаем прогресс
            if (progressTimer) {
                clearInterval(progressTimer);
            }
            requestInfo.progress = 100;
            onProgress?.(100);

            return result;

        } catch (error) {
            if (progressTimer) {
                clearInterval(progressTimer);
            }
            throw error;
        }
    }

    /**
     * Утилита для задержки
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Получает количество активных запросов
     */
    private getActiveRequestCount(): number {
        return Array.from(this.activeRequests.values())
            .filter(r => r.status === 'in-progress' || r.status === 'pending')
            .length;
    }

    /**
     * Очистка старых данных
     */
    private cleanupOldData(): void {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 минут

        // Очистка истории зума
        for (const [field, history] of this.zoomHistory) {
            const filtered = history.filter(h => now - h.time < maxAge);
            if (filtered.length === 0) {
                this.zoomHistory.delete(field);
            } else if (filtered.length < history.length) {
                this.zoomHistory.set(field, filtered);
            }
        }

        // Очистка старых отложенных запросов
        for (const [key, req] of this.debouncedRequests) {
            if (now - req.createdAt > 30000) { // 30 секунд
                clearTimeout(req.timeoutId);
                req.reject(new DOMException('Request timeout', 'TimeoutError'));
                this.debouncedRequests.delete(key);
                console.warn(`[RequestManager] Cleaned up stale debounced request: ${key}`);
            }
        }

        console.log(`[RequestManager] Cleanup completed. Active: ${this.activeRequests.size}, Debounced: ${this.debouncedRequests.size}`);
    }

    /**
     * Получение статистики
     */
    public getStats(): {
        activeRequests: number;
        debouncedRequests: number;
        zoomingFields: string[];
        failedRequests: Map<string, number>;
    } {
        const zoomingFields: string[] = [];

        for (const [field] of this.zoomHistory) {
            const analysis = this.analyzeZoomVelocity(field, 0, { from: new Date(), to: new Date() });
            if (analysis.isZooming) {
                zoomingFields.push(field);
            }
        }

        return {
            activeRequests: this.activeRequests.size,
            debouncedRequests: this.debouncedRequests.size,
            zoomingFields,
            failedRequests: new Map(this.failureCount)
        };
    }

    /**
     * Сброс всех запросов и очистка
     */
    public clear(): void {
        // Отменяем все активные запросы
        for (const request of this.activeRequests.values()) {
            if (request.status !== 'completed') {
                request.abortController.abort();
            }
        }

        // Отменяем все отложенные запросы
        for (const req of this.debouncedRequests.values()) {
            clearTimeout(req.timeoutId);
            req.reject(new DOMException('Manager cleared', 'AbortError'));
        }

        // Очищаем все хранилища
        this.activeRequests.clear();
        this.debouncedRequests.clear();
        this.requestHistory.clear();
        this.zoomHistory.clear();
        this.failureCount.clear();

        console.log('[RequestManager] All requests cleared');
    }
}

// Экспортируем singleton
export const requestManager = RequestManager.getInstance();