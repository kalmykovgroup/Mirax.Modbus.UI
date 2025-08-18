
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { getApiBaseUrl, API_TIMEOUT } from './config';
import { retryConfig } from './retryConfig';
import {serializeParams} from "@shared/api/base/paramsSerializer.ts";
/**
 * Единый axios-инстанс:
 * - baseURL из VITE_API_URL
 * - withCredentials: true (HttpOnly cookie)
 * - интерцепторы (401/403/429/5xx)
 * - ретраи (axios-retry) по нашему конфигу
 */

export const apiClient = axios.create({
    baseURL: getApiBaseUrl(),   // ← https://localhost:5001 из .env
    withCredentials: true,      // ← ВСЕ запросы с cookie
    paramsSerializer: serializeParams,
    timeout: API_TIMEOUT,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client-Type": "web",   // ← твоя ветка для браузера
    },
});

// setupInterceptors(apiClient); Убираем отсюда, чтобы подключать позже в main.tsx
axiosRetry(apiClient, retryConfig);
