// chartsBaseQuery.ts
import type { BaseQueryFn } from '@reduxjs/toolkit/query/react'
import type { AxiosError, AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import { decPending, incPending } from '@/store/uiSlice.ts'
import { chartsClient } from '@chartsPage/baseApi/chartsClient.ts'
import type {ApiResponse} from "@shared/contracts/Dtos/RemoteDtos/CommonDtos/ApiResponse.ts";
import type {ApiError} from "@shared/api/base/helpers/ApiError.ts";
import {isApiResponse} from "@shared/api/base/helpers/isApiResponse.ts";
import {fail} from "@shared/api/base/helpers/fail.ts";
import {ok} from "@shared/api/base/helpers/ok.ts";

export type AxiosChartsBaseQueryArgs = {
    url: string
    method?: Method
    data?: unknown
    params?: unknown
    headers?: AxiosRequestConfig['headers']
    lockUi?: boolean
    parseDates?: boolean
}

/**
 * Рекурсивно преобразует строки ISO дат в Date объекты
 */
function parseDatesInObject(obj: any): any {
    if (obj === null || obj === undefined) return obj
    if (obj instanceof Date) return obj

    if (typeof obj === 'string') {
        const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/
        if (isoDatePattern.test(obj)) {
            const parsed = new Date(obj)
            if (!isNaN(parsed.getTime())) {
                return parsed
            }
        }
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map(item => parseDatesInObject(item))
    }

    if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = parseDatesInObject(obj[key])
            }
        }
        return result
    }

    return obj
}

export const axiosChartsBaseQuery =
    (): BaseQueryFn<AxiosChartsBaseQueryArgs, unknown, ApiError> =>
        async (args, api) => {
            const method: Method = (args.method ?? 'get') as Method
            const { url, data, params, headers, lockUi = true, parseDates = true } = args

            if (lockUi) api.dispatch(incPending())

            try {
                //Строгая типизация заголовков
                const reqHeaders = { ...(headers ?? {}) } as Record<string, string>;

                // Проставляем Content-Type только если есть body
                if (data !== undefined && !reqHeaders['Content-Type']) {
                    reqHeaders['Content-Type'] = 'application/json';
                }

                // 2) Конфигурация
                const cfg: AxiosRequestConfig<unknown> = {
                    url,
                    method,
                    withCredentials: true,
                    signal: api.signal,
                    ...(data !== undefined ? { data } : {}),
                    ...(params !== undefined ? { params } : {}),
                    ...(reqHeaders && Object.keys(reqHeaders).length ? { headers: reqHeaders } : {}),
                }

                // 3) Запрос
                const res: AxiosResponse<ApiResponse> = await chartsClient.request<ApiResponse>(cfg)
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