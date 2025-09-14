// src/shared/api/metadataApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { axiosChartsBaseQuery } from '@charts/shared/api/base/chartsBaseQuery'
import { API } from '@app/providers/endpoints'
import type { DatabaseDto } from '@charts/shared/contracts/metadata/Dtos/DatabaseDto'
import type { UpdateDatabaseRequest } from '@charts/shared/contracts/metadata/Dtos/Requests/UpdateDatabaseRequest'
import type { CreateDatabaseRequest } from '@charts/shared/contracts/metadata/Dtos/Requests/CreateDatabaseRequest'
import type { EntityMetaDto } from '@charts/shared/contracts/metadata/Dtos/EntityMetaDto'
import type { FieldMetaDto } from '@charts/shared/contracts/metadata/Dtos/FieldMetaDto'
import type {Guid} from "@app/lib/types/Guid.ts";

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

        updateDatabase: b.mutation<DatabaseDto, { body: UpdateDatabaseRequest }>({
            query: ({ body }) => ({ url: `${API.DATABASES.UPDATE(body.id)}`, method: 'put', data: body }),
            invalidatesTags: ['Metadata/databases/update'],
        }),

        deleteDatabase: b.mutation<boolean, { id: string }>({
            query: ({ id }) => ({ url: `${API.DATABASES.DELETE(id)}`, method: 'delete' }),
            invalidatesTags: ['Metadata/databases/delete'],
        }),

        // ⬇️ добавили dbId в аргументы
        getEntities: b.query<EntityMetaDto[], { dbId: Guid }>({
            query: () => ({
                url: API.DATABASES.ENTITIES,
                method: 'get',
                // dbId не нужен серверу (он уходит в заголовке X-Db),
                // но присутствует в аргументах для уникального ключа кэша
            }),
            providesTags: (_res, _err, { dbId }) => [{ type: 'Metadata/databases/entities', id: dbId }],
            keepUnusedDataFor: 300,
        }),

        // ⬇️ и здесь — dbId + entity
        getEntityFields: b.query<FieldMetaDto[], { entity: string; dbId: Guid }>({
            query: ({ entity }) => ({
                url: API.DATABASES.FIELDS,
                method: 'get',
                params: { entity },
            }),
            providesTags: (_res, _err, { dbId, entity }) => [
                { type: 'Metadata/databases/fields', id: `${dbId}::${entity}` }
            ],
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
