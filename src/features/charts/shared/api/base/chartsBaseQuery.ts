import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { AxiosError, AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import type { AxiosBaseQueryArgs } from '@shared/api/base/baseQuery.ts'
import type { ApiError } from '@shared/api/base/halpers/ApiError.ts'
import { fail } from '@shared/api/base/halpers/fail.ts'
import { ok } from '@shared/api/base/halpers/ok.ts'
import { isApiResponse } from '@shared/api/base/halpers/isApiResponse.ts'
import { chartsClient } from '@charts/shared/api/base/chartsClient.ts'
import type { RootState } from '@/store/types'

export const axiosChartsBaseQuery =
    (): BaseQueryFn<AxiosBaseQueryArgs, unknown, ApiError> =>
        async (args, api) => {
            const method: Method = (args.method ?? 'get') as Method
            const { url, data, params } = args

            try {
                // 1) Берём выбранную БД из стора
                const state = api.getState() as RootState
                const dbId = state.chartsMeta?.editEntity?.databaseId

                console.log("base:Запрос", "dbId:"+dbId, url, data)

                // 2) Объединяем заголовки, НЕ сужая тип
                const headers: AxiosRequestConfig['headers'] = { ...(args.headers as any) }
                if (dbId && !(headers && (headers as any)['X-Db'])) {
                    (headers as any)['X-Db'] = String(dbId)
                }
                if (data !== undefined && !(headers && (headers as any)['Content-Type'])) {
                    (headers as any)['Content-Type'] = 'application/json'
                }

                // 3) Собираем конфиг без undefined-полей
                const cfg: AxiosRequestConfig<unknown> = {
                    url,
                    method,
                    withCredentials: true,
                    signal: api.signal,
                    ...(data   !== undefined ? { data }   : {}),
                    ...(params !== undefined ? { params } : {}),
                    ...(headers ? { headers } : {}),
                }

                // 4) Выполняем запрос
                const res: AxiosResponse<unknown> = await chartsClient.request<unknown>(cfg)
                const payload = res.data

                if (isApiResponse(payload)) {
                    if (!payload.success) return fail({ status: res.status, data: payload })
                    return ok(payload.data as unknown)
                }
                return ok(payload)
            } catch (e) {
                console.log(e)
                const err = e as AxiosError<unknown>
                const status = err.response?.status
                const resp = err.response?.data
                if (resp && isApiResponse(resp)) return fail({ status, data: resp })
                return fail({ status, data: resp ?? err.message })
            }
        }
