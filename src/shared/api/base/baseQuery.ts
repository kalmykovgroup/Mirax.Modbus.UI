// src/shared/api/base/baseQuery.ts
import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { AxiosError, AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import { apiClient } from './apiClient'
import {fail} from "@shared/api/base/halpers/fail.ts";
import {ok} from "@shared/api/base/halpers/ok.ts";
import {isApiResponse} from "@shared/api/base/halpers/isApiResponse.ts";
import type {ApiError} from "@shared/api/base/halpers/ApiError.ts";
import {decPending, incPending} from "@/store/uiSlice.ts";
import {extractErrorMessage, notify} from "@app/lib/notify.ts";


export type AxiosBaseQueryArgs = {
    url: string
    method?: Method
    data?: unknown
    params?: unknown
    headers?: AxiosRequestConfig['headers'],
    /** Блокировать ли UI для этого запроса (по умолчанию true) */
    lockUi?: boolean
}


export const axiosBaseQuery =
    ():
        BaseQueryFn<AxiosBaseQueryArgs, unknown, ApiError> =>
        async (args, api) => {
            const method: Method = (args.method ?? 'get') as Method
            const { url, data, params, headers, lockUi = false } = args
            if (lockUi) api.dispatch(incPending())
            try {
                // 1) Всегда иметь объект заголовков (не мутируем args.headers)
                const reqHeaders: AxiosRequestConfig['headers'] = { ...(headers as any) };

                // 2) Проставляем Content-Type только если есть body и его не указали вручную
                if (data !== undefined && !(reqHeaders && (reqHeaders as any)['Content-Type'])) {
                    (reqHeaders as any)['Content-Type'] = 'application/json';
                }

                // 3) Собираем конфиг без undefined-полей
                const cfg: AxiosRequestConfig<unknown> = {
                    url,
                    method,
                    withCredentials: true,
                    signal: api.signal,
                    ...(data   !== undefined ? { data }   : {}),
                    ...(params !== undefined ? { params } : {}),
                    ...(reqHeaders && Object.keys(reqHeaders).length ? { headers: reqHeaders } : {}),
                };

                // 4) Запрос
                const res: AxiosResponse<unknown> = await apiClient.request<unknown>(cfg)
                const payload = res.data

                if (isApiResponse(payload)) {
                    if (!payload.success) {
                        return fail({ status: res.status, data: payload })
                    }
                    return ok(payload.data as unknown)
                }

                // Необёрнутый ответ — вернём как есть
                return ok(payload)
            } catch (e) {
                const err = e as AxiosError<unknown>;
                const payload = err.response?.data ?? err.message;
                notify.error(extractErrorMessage(payload));

                const status = err.response?.status
                const errData: unknown = err.response?.data ?? err.message
                return fail({ status, data: errData })
            } finally {
                if (lockUi) api.dispatch(decPending())
            }
        }
