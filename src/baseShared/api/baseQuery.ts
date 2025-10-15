// src/shared/baseApi/base/baseQuery.ts
import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { AxiosError, AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import { apiClient } from './apiClient.ts'
import {decPending, incPending} from "@/baseStore/uiSlice.ts";
import type {ApiResponse} from "@/baseShared/dtos/ApiResponse.ts";
import type {ApiError} from "@/baseShared/api/helpers/ApiError.ts";
import {isApiResponse} from "@/baseShared/api/helpers/isApiResponse.ts";
import {fail} from "@/baseShared/api/helpers/fail.ts";
import {ok} from "@/baseShared/api/helpers/ok.ts";
import {parseDatesInObject} from "@app/lib/utils/parseDatesInObject.ts";


export type AxiosBaseQueryArgs = {
    url: string
    method?: Method
    data?: unknown
    params?: unknown
    headers?: AxiosRequestConfig['headers'],
    /** Блокировать ли UI для этого запроса (по умолчанию true) */
    lockUi?: boolean
    parseDates?: boolean
}




export const axiosBaseQuery =
    ():
        BaseQueryFn<AxiosBaseQueryArgs, unknown, ApiError> =>
        async (args, api) => {
            const method: Method = (args.method ?? 'get') as Method
            const { url, data, params, headers, lockUi = false, parseDates = true } = args
            if (lockUi) api.dispatch(incPending())
            try {
                //Строгая типизация заголовков
                const reqHeaders = { ...(headers ?? {}) } as Record<string, string>;

                // Проставляем Content-Type только если есть body
                if (data !== undefined && !reqHeaders['Content-Type']) {
                    reqHeaders['Content-Type'] = 'application/json';
                }

                // Собираем конфиг без undefined-полей
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
                const res: AxiosResponse<ApiResponse<unknown>> = await apiClient.request<ApiResponse>(cfg)
                let payload = res.data

                // 4) Парсинг дат
                if (parseDates) {
                    payload = parseDatesInObject(payload)
                }

                // 5) Проверка ApiResponse
                if (isApiResponse(payload)) {
                    // КРИТИЧНО: success: false → возвращаем fail БЕЗ throw
                    // Нотификации показывает thunk/компонент, НЕ baseQuery
                    if (!payload.success) {
                        return fail({
                            status: res.status,
                            data: payload
                        })
                    }

                    return ok(payload.data as unknown)
                }

                // Сырые данные
                return ok(payload)
            } catch (e) {

                // Только сетевые ошибки (timeout, network error, 5xx)
                const err = e as AxiosError<unknown>
                const status = err.response?.status
                const resp = err.response?.data

                // НЕ показываем нотификацию здесь — делегируем thunk
                if (resp && isApiResponse(resp)) {
                    return fail({ status, data: resp })
                }

                return fail({
                    status,
                    data: resp ?? err.message
                })
            } finally {
                if (lockUi) api.dispatch(decPending())
            }
        }
