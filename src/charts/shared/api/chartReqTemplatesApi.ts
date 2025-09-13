// src/shared/api/chartReqTemplatesApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { axiosChartsBaseQuery } from '@shared/api/base/graphic/chartsBaseQuery'
import { API } from '@shared/contracts/endpoints'
import type {ChartReqTemplateDto} from "@/charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts";

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
        createTemplate: b.mutation<ChartReqTemplateDto, ChartReqTemplateDto>({
            query: (body) => ({ url: API.TEMPLATES.CREATE, method: 'post', data: body }),
            invalidatesTags: ['Templates/create'],
        }),
        updateTemplate: b.mutation<ChartReqTemplateDto, {body: ChartReqTemplateDto }>({
            query: ({ body }) => ({ url: `${API.TEMPLATES.UPDATE(body.id)}`, method: 'put', data: body }),
            invalidatesTags: ['Templates/update'],
        }),
        deleteTemplate: b.mutation<boolean, { id: string }>({
            query: ({ id }) => ({ url: `${API.TEMPLATES.DELETE(id)}`, method: 'delete' }),
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
