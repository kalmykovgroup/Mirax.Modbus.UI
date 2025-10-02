// src/shared/baseApi/chartReqTemplatesApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import type {Guid} from "@app/lib/types/Guid.ts";
import type {ChartReqTemplateDto} from "@chartsPage/template/shared//dtos/ChartReqTemplateDto.ts";
import {axiosChartsBaseQuery} from "@chartsPage/baseApi/chartsBaseQuery.ts";
import {API} from "@app/providers/endpoints.ts";
import type {
    CreateChartReqTemplateRequest
} from "@chartsPage/template/shared//dtos/requests/CreateChartReqTemplateRequest.ts";
import type {
    UpdateChartReqTemplateRequest
} from "@chartsPage/template/shared//dtos/requests/UpdateChartReqTemplateRequest.ts";

export const chartReqTemplatesApi = createApi({
    reducerPath: 'chartReqTemplatesApi',
    baseQuery: axiosChartsBaseQuery(),
    tagTypes: ['Templates/all', 'Templates/create', 'Templates/update', 'Templates/delete'],
    endpoints: (b) => ({
        getTemplates: b.query<ChartReqTemplateDto[], void>({
            query: () => ({ url: API.TEMPLATES.All, method: 'get' }),
            providesTags: ['Templates/all'],
            keepUnusedDataFor: 300,
        }),
        createTemplate: b.mutation<ChartReqTemplateDto, CreateChartReqTemplateRequest>({
            query: (body) => ({ url: API.TEMPLATES.CREATE, method: 'post', data: body }),
            invalidatesTags: ['Templates/create'],
        }),
        updateTemplate: b.mutation<ChartReqTemplateDto, UpdateChartReqTemplateRequest>({
            query: (body ) => ({ url: API.TEMPLATES.UPDATE(body.id), method: 'put', data: body }),
            invalidatesTags: ['Templates/update'],
        }),
        deleteTemplate: b.mutation<boolean, Guid>({
            query: (body) => ({ url: API.TEMPLATES.DELETE(body), method: 'delete' }),
            invalidatesTags: ['Templates/delete'],
        }),
    }),
})

export const {
    useGetTemplatesQuery,
    useCreateTemplateMutation,
    useUpdateTemplateMutation,
    useDeleteTemplateMutation,
} = chartReqTemplatesApi
