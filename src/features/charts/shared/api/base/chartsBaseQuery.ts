import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { AxiosError, AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import type { ApiError } from '@shared/api/base/halpers/ApiError.ts'
import { fail } from '@shared/api/base/halpers/fail.ts'
import { ok } from '@shared/api/base/halpers/ok.ts'
import { isApiResponse } from '@shared/api/base/halpers/isApiResponse.ts'
import { chartsClient } from '@charts/shared/api/base/chartsClient.ts'
import {decPending, incPending} from "@/store/uiSlice.ts";
import {extractErrorMessage, notify} from "@app/lib/notify.ts";

export type AxiosChartsBaseQueryArgs = {
    url: string
    method?: Method
    data?: unknown
    params?: unknown
    headers?: AxiosRequestConfig['headers'],
    /** Блокировать ли UI для этого запроса (по умолчанию true) */
    lockUi?: boolean
    /** Парсить ли даты автоматически (по умолчанию true) */
    parseDates?: boolean
}

/**
 * Рекурсивно преобразует строки ISO дат в Date объекты
 * Очень аккуратно проверяет формат чтобы не сломать другие строки
 */
function parseDatesInObject(obj: any): any {
    // Базовые случаи
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return obj;

    // Проверяем строки на ISO формат даты
    if (typeof obj === 'string') {
        // Паттерн для ISO дат: YYYY-MM-DDTHH:mm:ss с опциональными миллисекундами и временной зоной
        // Примеры: 2025-08-29T15:00:00.0000000+00:00, 2025-08-29T15:00:00Z, 2025-08-29T15:00:00
        const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

        if (isoDatePattern.test(obj)) {
            const parsed = new Date(obj);
            // Проверяем что дата валидная
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return obj;
    }

    // Обработка массивов
    if (Array.isArray(obj)) {
        return obj.map(item => parseDatesInObject(item));
    }

    // Обработка объектов
    if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                result[key] = parseDatesInObject(obj[key]);
            }
        }
        return result;
    }

    // Все остальные типы возвращаем как есть
    return obj;
}

export const axiosChartsBaseQuery =
    (): BaseQueryFn<AxiosChartsBaseQueryArgs, unknown, ApiError> =>
        async (args, api) => {
            const method: Method = (args.method ?? 'get') as Method
            const { url, data, params, headers, lockUi = true, parseDates = true } = args

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
                const res: AxiosResponse<unknown> = await chartsClient.request<unknown>(cfg);
                let payload = res.data;

                // 5) Парсим даты если включено
                if (parseDates) {
                    payload = parseDatesInObject(payload);
                }

                if (isApiResponse(payload)) {
                    if (!payload.success) return fail({ status: res.status, data: payload })
                    return ok(payload.data as unknown)
                }
                return ok(payload)
            } catch (e) {

                const err = e as AxiosError<unknown>;
                const payload = err.response?.data ?? err.message;
                notify.error(extractErrorMessage(payload));

                const status = err.response?.status
                const resp = err.response?.data
                if (resp && isApiResponse(resp)) return fail({ status, data: resp })
                return fail({ status, data: resp ?? err.message })
            }finally {
                if (lockUi) api.dispatch(decPending())
            }
        }