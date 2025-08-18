// src/shared/api/base/config.ts

/** Базовый URL API (Vite: VITE_API_URL в .env) */
export const getApiBaseUrl = (): string =>
    import.meta.env.VITE_API_URL ?? window.location.origin;

/** Таймаут HTTP-запросов (мс) */
export const API_TIMEOUT = 15_000;

/** Кол-во повторов при временных ошибках */
export const API_RETRY_COUNT = 3;

/** Минимальная задержка между повторами (мс) */
export const API_RETRY_BASE_DELAY = 500;
