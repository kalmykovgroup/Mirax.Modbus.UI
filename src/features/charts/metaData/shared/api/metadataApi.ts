// src/shared/api/metadataApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import type {Guid} from "@app/lib/types/Guid.ts";
import type {DatabaseDto} from "@charts/metaData/shared/dtos/DatabaseDto.ts";
import {axiosChartsBaseQuery} from "@charts/api/chartsBaseQuery.ts";
import {API} from "@app/providers/endpoints.ts";
import type {CreateDatabaseRequest} from "@charts/metaData/shared/dtos/requests/CreateDatabaseRequest.ts";
import type {UpdateDatabaseRequest} from "@charts/metaData/shared/dtos/requests/UpdateDatabaseRequest.ts";
import type {EntityDto} from "@charts/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";

export const metadataApi = createApi({
    reducerPath: 'metadataApi',
    baseQuery: axiosChartsBaseQuery(),
    tagTypes: [
        'Metadata/databases/all',
        'Metadata/databases/create',
        'Metadata/databases/update',
        'Metadata/databases/delete',
        'Metadata/databases/entities',
        'Metadata/databases/fields',
    ],
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

        updateDatabase: b.mutation<DatabaseDto, UpdateDatabaseRequest>({
            query: ( body ) => ({ url: `${API.DATABASES.UPDATE(body.id)}`, method: 'put', data: body }),
            invalidatesTags: ['Metadata/databases/update'],
        }),

        deleteDatabase: b.mutation<boolean, { id: Guid }>({
            query: ({id}) => ({ url: `${API.DATABASES.DELETE(id)}`, method: 'delete' }),
            invalidatesTags: [{ type: 'Metadata/databases/delete' }],
        }),

        getEntities: b.mutation<EntityDto[], void>({
            query: () => ({
                url: API.DATABASES.ENTITIES,
                method: 'get',
                // dbId не нужен серверу (он уходит в заголовке X-Db),
                // но присутствует в аргументах для уникального ключа кэша
            }),
            invalidatesTags: [{ type: 'Metadata/databases/entities' }]
        }),

        getEntityFields: b.mutation<FieldDto[], { entity: string; }>({
            query: ({ entity }) => ({
                url: API.DATABASES.FIELDS,
                method: 'get',
                params: { entity },
            }),
            invalidatesTags: [{ type: 'Metadata/databases/fields' }],
        }),
    }),
})

export const {
    useGetDatabasesQuery,
    useCreateDatabaseMutation,
    useUpdateDatabaseMutation,
    useDeleteDatabaseMutation,
    useGetEntitiesMutation,
    useGetEntityFieldsMutation,
} = metadataApi
