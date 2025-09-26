// src/shared/api/chartsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { API } from '@app/providers/endpoints.ts'
import { axiosChartsBaseQuery } from '@charts/shared/api/base/chartsBaseQuery.ts'
import type {MultiSeriesResponse} from "@charts/shared/contracts/chart/Dtos/Responses/MultiSeriesResponse.ts";
import type {GetMultiSeriesRequest} from "@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts";
import type {RawSeriesResponse} from "@charts/shared/contracts/chart/Dtos/Responses/RawSeriesResponse.ts";
import type {GetRawRequest} from "@charts/shared/contracts/chart/Dtos/Requests/GetRawRequest.ts";
import type {MultiRawResponse} from "@charts/shared/contracts/chart/Dtos/Responses/MultiRawResponse.ts";
import type {GetMultiRawRequest} from "@charts/shared/contracts/chart/Dtos/Requests/GetMultiRawRequest.ts";
import {type RequestWithDb} from "@charts/shared/api/base/types.ts";

// ---- DTOs ----

// Стабильная сериализация тела для тегов
function stableBody<T extends Record<string, any>>(o: T): string {
    const sorted: Record<string, any> = {}
    Object.keys(o).sort().forEach(k => {
        const v = (o as any)[k]
        if (Array.isArray(v)) sorted[k] = [...v].sort()
        else if (v && typeof v === 'object') {
            sorted[k] = Object.keys(v).sort().reduce((acc, kk) => (acc[kk] = v[kk], acc), {} as any)
        } else sorted[k] = v
    })
    return JSON.stringify(sorted)
}

export const chartsApi = createApi({
    reducerPath: 'chartsApi',
    baseQuery: axiosChartsBaseQuery(),
    tagTypes: ['MultiSeries', 'Raw', 'MultiRaw'],
    endpoints: (builder) => ({

        // ⬇⬇ ключевое — аргумент теперь RequestWithDb<...>
        getMultiSeries: builder.query<MultiSeriesResponse, RequestWithDb<GetMultiSeriesRequest>>({
            query: ({ body, dbId }) => ({
                url: API.CHARTS.MULTI,
                method: 'post',
                data: body,
                headers: { "X-Db": String(dbId) }, // ← пер-запросный X-Db
            }),
            providesTags: (_res, _err, { body }) => [{ type: 'MultiSeries', id: stableBody(body as any) }],
            keepUnusedDataFor: 60,
        }),

        getRaw: builder.query<RawSeriesResponse, RequestWithDb<GetRawRequest>>({
            query: ({ body, dbId }) => ({
                url: API.CHARTS.RAW,
                method: 'post',
                data: body,
                headers: dbId ? { "X-Db": String(dbId) } : undefined,
            }),
            providesTags: (_res, _err, { body }) => [{ type: 'Raw', id: stableBody(body as any) }],
            keepUnusedDataFor: 60,
        }),

        getMultiRaw: builder.query<MultiRawResponse, RequestWithDb<GetMultiRawRequest>>({
            query: ({ body, dbId }) => ({
                url: API.CHARTS.MULTI_RAW,
                method: 'post',
                data: body,
                headers: dbId ? { "X-Db": String(dbId) } : undefined,
            }),
            providesTags: (_res, _err, { body }) => [{ type: 'MultiRaw', id: stableBody(body as any) }],
            keepUnusedDataFor: 60,
        }),

    }),
})

export const {
    useGetMultiSeriesQuery,
    useLazyGetMultiSeriesQuery,
    useGetRawQuery,
    useLazyGetRawQuery,
} = chartsApi
