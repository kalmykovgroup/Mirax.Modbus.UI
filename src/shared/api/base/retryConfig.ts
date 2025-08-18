// src/shared/api/base/retryConfig.ts
import axiosRetry, { type IAxiosRetryConfig } from 'axios-retry';
import { API_RETRY_BASE_DELAY, API_RETRY_COUNT } from './config';

/**
 * Конфиг ретраев для axios-retry@4.5.0.
 * - НЕ используем methodsToRetry/statusCodesToRetry (их нет в v4).
 * - Ретраим только идемпотентные методы (GET/HEAD/OPTIONS/PUT/DELETE) через retryCondition.
 * - Ретраим сетевые/таймаут ошибки и коды 5xx/429.
 * - Задержка — экспоненциальная с минимальным порогом.
 */
export const retryConfig: IAxiosRetryConfig = {
    retries: API_RETRY_COUNT,

    retryDelay: (retryCount, error) => {
        // exponentialDelay учитывает Retry-After
        const base = axiosRetry.exponentialDelay(retryCount, error);
        return Math.max(base, API_RETRY_BASE_DELAY);
    },

    shouldResetTimeout: true,

    retryCondition: (error) => {
        // 1) Разрешаем ретрай только для идемпотентных методов
        const method = (error?.config?.method || '').toUpperCase();
        const idempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'PUT' || method === 'DELETE';
        if (!idempotent) return false;

        // 2) Сетевые / timeout (response отсутствует)
        if (!error?.response) return true;

        // 3) Статусы 5xx и 429
        const status = error.response.status;
        if (status === 429) return true;
        if (status >= 500 && status <= 599) return true;

        return false;
    },
};
