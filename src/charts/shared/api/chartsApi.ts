// src/shared/api/chartsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { API } from '@shared/contracts/endpoints.ts'
import { axiosChartsBaseQuery } from '@shared/api/base/graphic/chartsBaseQuery.ts'
import type {EntityMetaDto} from "@/charts/shared/contracts/chart/Dtos/EntityMetaDto.ts";
import type {FieldMetaDto} from "@/charts/shared/contracts/chart/Dtos/FieldMetaDto.ts";
import type {SeriesResponse} from "@/charts/shared/contracts/chart/Dtos/Responses/SeriesResponse.ts";
import type {GetSeriesRequest} from "@/charts/shared/contracts/chart/Dtos/Requests/GetSeriesRequest.ts";
import type {MultiSeriesResponse} from "@/charts/shared/contracts/chart/Dtos/Responses/MultiSeriesResponse.ts";
import type {GetMultiSeriesRequest} from "@/charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest.ts";
import type {RawSeriesResponse} from "@/charts/shared/contracts/chart/Dtos/Responses/RawSeriesResponse.ts";
import type {GetRawRequest} from "@/charts/shared/contracts/chart/Dtos/Requests/GetRawRequest.ts";

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
    tagTypes: ['Databases', 'Entities', 'EntityFields', 'Series', 'MultiSeries', 'Raw'],
    endpoints: (builder) => ({

        getDatabases: builder.query<string[], void>({
            query: () => ({ url: API.CHARTS.DATABASES, method: 'get' }),
            providesTags: ['Databases'],
            keepUnusedDataFor: 300,
        }),

        // Метаданные
        getEntities: builder.query<EntityMetaDto[], void>({
            query: () => ({ url: API.CHARTS.ENTITIES, method: 'get' }),
            providesTags: ['Entities'],
            keepUnusedDataFor: 300,
        }),

        getEntityFields: builder.query<FieldMetaDto[], { entity: string }>({
            query: ({ entity }) => ({
                url: API.CHARTS.FIELDS,
                method: 'get',
                params: { entity },
            }),
            providesTags: (_res, _err, arg) => [{ type: 'EntityFields', id: arg.entity }],
            keepUnusedDataFor: 600,
        }),

        // Данные
        getSeries: builder.query<SeriesResponse, GetSeriesRequest>({
            query: (body) => ({
                url: API.CHARTS.SERIES,   // POST /charts/series
                method: 'post',
                data: body,
            }),
            providesTags: (_res, _err, body) => [{ type: 'Series', id: stableBody(body) }],
            keepUnusedDataFor: 60,
        }),

        getMultiSeries: builder.query<MultiSeriesResponse, GetMultiSeriesRequest>({
            query: (body) => ({
                url: API.CHARTS.MULTI,    // POST /charts/multi
                method: 'post',
                data: body,
            }),
            providesTags: (_res, _err, body) => [{ type: 'MultiSeries', id: stableBody(body) }],
            keepUnusedDataFor: 60,
        }),

        getRaw: builder.query<RawSeriesResponse, GetRawRequest>({
            query: (body) => ({
                url: API.CHARTS.RAW,      // POST /charts/raw
                method: 'post',
                data: body,
            }),
            providesTags: (_res, _err, body) => [{ type: 'Raw', id: stableBody(body) }],
            keepUnusedDataFor: 60,
        }),

    }),
})

export const {
    useGetDatabasesQuery,
    useGetEntitiesQuery,
    useGetEntityFieldsQuery,
    useGetSeriesQuery,
    useLazyGetSeriesQuery,
    useGetMultiSeriesQuery,
    useLazyGetMultiSeriesQuery,
    useGetRawQuery,
    useLazyGetRawQuery,
} = chartsApi
