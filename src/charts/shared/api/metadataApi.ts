// src/shared/api/chartReqTemplatesApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { axiosChartsBaseQuery } from '@shared/api/base/graphic/chartsBaseQuery'
import { API } from '@shared/contracts/endpoints'
import type {DatabaseDto} from "@/charts/shared/contracts/metadata/Dtos/DatabaseDto.ts";
import type {UpdateDatabaseRequest} from "@/charts/shared/contracts/metadata/Dtos/Requests/UpdateDatabaseRequest.ts";
import type {CreateDatabaseRequest} from "@/charts/shared/contracts/metadata/Dtos/Requests/CreateDatabaseRequest.ts";
import type {EntityMetaDto} from "@/charts/shared/contracts/metadata/Dtos/EntityMetaDto.ts";
import type {FieldMetaDto} from "@/charts/shared/contracts/metadata/Dtos/FieldMetaDto.ts";

export const metadataApi = createApi({
    reducerPath: 'metadataApi',
    baseQuery: axiosChartsBaseQuery(),
    tagTypes: ['Metadata/databases/all', 'Metadata/databases/create', 'Metadata/databases/update', 'Metadata/databases/delete', "Metadata/databases/entities", "Metadata/databases/fields"],
    endpoints: (b) => ({
        getDatabases: b.query<DatabaseDto[], void>({
            query: () => ({ url: API.DATABASES.All, method: 'get' }),
            providesTags: ['Metadata/databases/all'],
            keepUnusedDataFor: 300,
        }),
        createDatabase: b.mutation<DatabaseDto, CreateDatabaseRequest>({
            query: (body) => ({ url: API.DATABASES.CREATE, method: 'post', data: body }),
            invalidatesTags: ['Metadata/databases/create'],
        }),
        updateDatabase: b.mutation<DatabaseDto, {body: UpdateDatabaseRequest }>({
            query: ({ body }) => ({ url: `${API.DATABASES.UPDATE(body.id)}`, method: 'put', data: body }),
            invalidatesTags: ['Metadata/databases/update'],
        }),
        deleteDatabase: b.mutation<boolean, { id: string }>({
            query: ({ id }) => ({ url: `${API.DATABASES.DELETE(id)}`, method: 'delete' }),
            invalidatesTags: ['Metadata/databases/delete'],
        }),

        getEntities: b.query<EntityMetaDto[], void>({
            query: () => ({ url: API.DATABASES.ENTITIES, method: 'get' }),
            providesTags: ['Metadata/databases/entities'],
            keepUnusedDataFor: 300,
        }),

        getEntityFields: b.query<FieldMetaDto[], { entity: string }>({
            query: ({ entity }) => ({
                url: API.DATABASES.FIELDS,
                method: 'get',
                params: { entity },
            }),
            providesTags: (_res, _err, arg) => [{ type: 'Metadata/databases/fields', id: arg.entity }],
            keepUnusedDataFor: 600,
        }),
    }),
})

export const {
    useGetDatabasesQuery,
    useCreateDatabaseMutation,
    useUpdateDatabaseMutation,
    useDeleteDatabaseMutation,
    useGetEntitiesQuery,
    useGetEntityFieldsQuery,
} = metadataApi
