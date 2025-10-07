// src/shared/baseApi/chartsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { API } from '@app/providers/endpoints.ts'
import type {RequestWithDb} from "@chartsPage/baseApi/types.ts";
import {axiosChartsBaseQuery} from "@chartsPage/baseApi/chartsBaseQuery.ts";
import type {MultiSeriesResponse} from "@chartsPage/charts/core/dtos/responses/MultiSeriesResponse.ts";
import type {GetMultiSeriesRequest} from "@chartsPage/charts/core/dtos/requests/GetMultiSeriesRequest.ts";

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

    }),
})

export const {
    useGetMultiSeriesQuery,
    useLazyGetMultiSeriesQuery,
} = chartsApi
