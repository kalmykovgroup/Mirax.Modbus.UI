// src/shared/baseApi/base/retryConfig.ts
import { type IAxiosRetryConfig } from 'axios-retry'
import type { AxiosError } from 'axios'


// ============================================
// КОНСТАНТЫ
// ============================================

/**
 * Максимальное количество повторных попыток
 */
const MAX_RETRIES = 3

/**
 * Минимальная задержка между попытками (мс)
 */
const MIN_RETRY_DELAY = 1000

/**
 * Максимальная задержка между попытками (мс)
 * Защита от слишком длительных ожиданий
 */
const MAX_RETRY_DELAY = 300000

/**
 * HTTP методы, которые считаются идемпотентными
 * Их безопасно повторять без риска дублирования данных
 */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'])

/**
 * HTTP статусы, при которых разрешён retry
 */
const RETRYABLE_STATUS_CODES = new Set([
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
])

/**
 * Коды сетевых ошибок, при которых разрешён retry
 */
const RETRYABLE_ERROR_CODES = new Set([
    'ECONNABORTED', // Соединение прервано
    'ECONNREFUSED', // Соединение отклонено
    'ECONNRESET',   // Соединение сброшено
    'ENETUNREACH',  // Сеть недоступна
    'ETIMEDOUT',    // Таймаут
    'ENOTFOUND',    // DNS не разрешён
])

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Проверяет, является ли HTTP-метод идемпотентным
 */
function isIdempotentMethod(method: string | undefined): boolean {
    if (!method) return false
    return IDEMPOTENT_METHODS.has(method.toUpperCase())
}

/**
 * Проверяет, является ли статус ответа подходящим для retry
 */
function isRetryableStatus(status: number | undefined): boolean {
    if (!status) return false
    return RETRYABLE_STATUS_CODES.has(status)
}

/**
 * Проверяет, является ли код ошибки сетевым
 */
function isNetworkError(error: AxiosError): boolean {
    return (
        !error.response &&
        error.code !== undefined &&
        RETRYABLE_ERROR_CODES.has(error.code)
    )
}

/**
 * Извлекает значение Retry-After из заголовков (в секундах)
 */
function getRetryAfterFromHeaders(error: AxiosError): number | undefined {
    const retryAfter = error.response?.headers?.['retry-after']
    if (!retryAfter) return undefined

    // Retry-After может быть числом (секунды) или датой
    const parsed = Number(retryAfter)
    if (!isNaN(parsed) && parsed > 0) {
        return parsed * 1000 // конвертируем в миллисекунды
    }

    // Пытаемся распарсить как дату
    const date = new Date(retryAfter)
    if (!isNaN(date.getTime())) {
        const delay = date.getTime() - Date.now()
        return Math.max(0, delay)
    }

    return undefined
}

/**
 * Вычисляет задержку с экспоненциальным backoff
 */
function calculateRetryDelay(retryCount: number, error: AxiosError): number {
    // 1) Проверяем Retry-After заголовок
    const retryAfter = getRetryAfterFromHeaders(error)
    if (retryAfter !== undefined) {
        // Ограничиваем максимальной задержкой
        return Math.min(retryAfter, MAX_RETRY_DELAY)
    }

    // 2) Экспоненциальная задержка: 2^(retryCount-1) * 1000ms
    // Попытка 1: 1s, Попытка 2: 2s, Попытка 3: 4s
    const exponentialDelay = Math.pow(2, retryCount - 1) * 1000

    // 3) Добавляем jitter (случайный разброс ±25%)
    // Помогает избежать thundering herd при множественных клиентах
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)
    const delayWithJitter = exponentialDelay + jitter

    // 4) Применяем ограничения
    return Math.max(
        MIN_RETRY_DELAY,
        Math.min(delayWithJitter, MAX_RETRY_DELAY)
    )
}

/**
 * Определяет, нужно ли повторять запрос
 */
function shouldRetryRequest(error: AxiosError): boolean {
    // 1) Проверяем метод - только идемпотентные
    if (!isIdempotentMethod(error.config?.method)) {
        return false
    }

    // 2) Сетевые ошибки (нет HTTP-ответа)
    if (isNetworkError(error)) {
        return true
    }

    // 3) Проверяем HTTP-статус
    if (error.response) {
        const status = error.response.status

        // 3.1) Явно разрешённые статусы
        if (isRetryableStatus(status)) {
            return true
        }

        // 3.2) НЕ ретраим успешные статусы (2xx)
        if (status >= 200 && status < 300) {
            return false
        }

        // 3.3) НЕ ретраим клиентские ошибки (4xx, кроме 408/429)
        if (status >= 400 && status < 500) {
            return false
        }

        // 3.4) Ретраим остальные 5xx
        if (status >= 500 && status < 600) {
            return true
        }
    }

    return false
}

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

/**
 * Production-ready конфигурация axios-retry
 *
 * Стратегия:
 * - Ретраим только идемпотентные методы (GET/HEAD/OPTIONS/PUT/DELETE)
 * - Ретраим сетевые ошибки (ECONNREFUSED, ETIMEDOUT, и т.д.)
 * - Ретраим 5xx и специфичные 4xx (408, 429)
 * - НЕ ретраим 2xx (даже если success: false в теле)
 * - НЕ ретраим большинство 4xx (клиентские ошибки)
 * - Экспоненциальная задержка с jitter
 * - Уважаем Retry-After заголовок
 * - Сбрасываем timeout при каждой попытке
 */
export const retryConfig: IAxiosRetryConfig = {
    /**
     * Максимальное количество повторных попыток
     */
    retries: MAX_RETRIES,

    /**
     * Функция вычисления задержки между попытками
     * - Экспоненциальный backoff: 1s, 2s, 4s
     * - Jitter ±25% для избежания thundering herd
     * - Учитывает Retry-After заголовок
     * - Ограничивается MIN/MAX_RETRY_DELAY
     */
    retryDelay: calculateRetryDelay,

    /**
     * Сбрасывать timeout при каждой попытке
     * Без этого флага таймаут считается глобально для всех попыток
     */
    shouldResetTimeout: true,

    /**
     * Условие для определения необходимости retry
     * - Проверяет идемпотентность метода
     * - Анализирует тип ошибки (сетевая/HTTP)
     * - Проверяет HTTP-статус
     */
    retryCondition: shouldRetryRequest,

    /**
     * Callback перед каждой повторной попыткой
     * Полезен для логирования и мониторинга
     */
    onRetry: (retryCount: number, error: AxiosError, requestConfig: any) => {
        const method = requestConfig.method?.toUpperCase() || 'UNKNOWN'
        const url = requestConfig.url || 'unknown'
        const status = error.response?.status || 'N/A'
        const errorCode = error.code || 'N/A'

        console.warn(
            `[axios-retry] Попытка ${retryCount}/${MAX_RETRIES}`,
            {
                method,
                url,
                status,
                errorCode,
                message: error.message,
            }
        )
    },

    /**
     * Callback при достижении максимального количества попыток
     * Полезен для алертинга и метрик
     */
    onMaxRetryTimesExceeded: (error: AxiosError, retryCount: number) => {
        const url = error.config?.url || 'unknown'
        console.error(
            `[axios-retry] Превышен лимит попыток (${retryCount}/${MAX_RETRIES})`,
            {
                url,
                status: error.response?.status,
                errorCode: error.code,
                message: error.message,
            }
        )
    },
}

// ============================================
// ЭКСПОРТ КОНСТАНТ (для использования в тестах)
// ============================================

export const RETRY_CONFIG_CONSTANTS = {
    MAX_RETRIES,
    MIN_RETRY_DELAY,
    MAX_RETRY_DELAY,
    IDEMPOTENT_METHODS,
    RETRYABLE_STATUS_CODES,
    RETRYABLE_ERROR_CODES,
} as const