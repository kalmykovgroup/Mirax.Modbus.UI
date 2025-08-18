// src/shared/api/base/baseQuery.ts
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { apiClient } from './apiClient';
import type { ApiResponse } from '@/shared/contracts/Dtos/CommonDtos/ApiResponse';

// Тип аргументов, с которыми будем вызывать baseQuery из createApi
export type AxiosBaseQueryArgs = {
    url: string;
    method?: AxiosRequestConfig['method'];
    data?: AxiosRequestConfig['data'];
    params?: AxiosRequestConfig['params'];
    headers?: AxiosRequestConfig['headers'];
};


// Type guard для ApiResponse<T>
const isApiResponse = (x: unknown): x is ApiResponse<unknown> => {
    return (
        typeof x === 'object' &&
        x !== null &&
        'success' in (x as any) &&
        ('data' in (x as any) || 'errorMessage' in (x as any))
    );
};

/**
 * Промышленный axios → RTK Query baseQuery, знающий про ApiResponse<T>.
 * - Если пришёл ApiResponse<T> c success=true → возвращаем data (тип T)
 * - Если success=false (даже при HTTP 200) → возвращаем error (RTK Query установит isError)
 * - Если пришёл не ApiResponse → отдаём как есть (на случай нестандартных ответов)
 */
export const axiosBaseQuery =
    ():
        BaseQueryFn<AxiosBaseQueryArgs, unknown, { status?: number; data?: unknown }> =>
        async (args, api) => {
            const { url, method = 'get', data, params, headers } = args;

            try {
                const res = await apiClient.request({
                    url,
                    method,
                    data,
                    params,
                    headers,
                    withCredentials: true,
                    signal: api.signal, // поддержка отмены
                });

                const payload = res.data;

                if (isApiResponse(payload)) {
                    if (!payload.success) {
                        // Логическая ошибка от бэка (включая HTTP 200) → конвертируем в error
                        return {
                            error: {
                                status: res.status, // обычно 200
                                data: payload,      // пробрасываем весь envelope (есть errorMessage)
                            },
                        };
                    }
                    // success === true → отдаём T
                    return { data: payload.data as unknown };
                }

                // Необёрнутый ответ — вернём как есть (fallback)
                return { data: payload };
            } catch (e) {
                const err = e as AxiosError;
                return {
                    error: {
                        status: err.response?.status,
                        data: err.response?.data ?? err.message,
                    },
                };
            }
        };
