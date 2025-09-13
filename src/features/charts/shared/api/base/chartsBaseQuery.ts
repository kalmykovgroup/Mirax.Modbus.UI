import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type {AxiosError, AxiosRequestConfig, AxiosResponse, Method} from 'axios'
import type {AxiosBaseQueryArgs} from "@shared/api/base/baseQuery.ts";
import type {ApiError} from "@shared/api/base/halpers/ApiError.ts";
import {fail} from "@shared/api/base/halpers/fail.ts";
import {ok} from "@shared/api/base/halpers/ok.ts";
import {isApiResponse} from "@shared/api/base/halpers/isApiResponse.ts";
import {chartsClient} from "@charts/shared/api/base/chartsClient.ts";


export const axiosChartsBaseQuery =
    ():
        BaseQueryFn<AxiosBaseQueryArgs, unknown, ApiError> =>
        async (args, api) => {
            const method: Method = (args.method ?? 'get') as Method
            const { url, data, params, headers } = args

            try {
                // Собираем конфиг без undefined-свойств (во избежание TS2379 с exactOptionalPropertyTypes)
                const cfg: AxiosRequestConfig<unknown> = { url, method, withCredentials: true, signal: api.signal }
                if (data !== undefined) cfg.data = data
                if (params !== undefined) cfg.params = params
                if (headers) cfg.headers = headers

                const res: AxiosResponse<unknown> = await chartsClient.request<unknown>(cfg)
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
                const err = e as AxiosError<unknown>
                const status = err.response?.status
                const errData: unknown = err.response?.data ?? err.message
                return fail({ status, data: errData })
            }
        }

