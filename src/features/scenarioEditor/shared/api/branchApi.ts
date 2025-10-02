// src/shared/baseApi/branchApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@shared/api/base/baseQuery.ts';

import { API } from '@app/providers/endpoints.ts';
import type { Guid } from '@app/lib/types/Guid.ts';

import type { BranchDto } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/BranchDto.ts';
import type { CreateBranchRequest } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/CreateBranchRequest.ts';
import type { UpdateBranchRequest } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/UpdateBranchRequest.ts';
import type {GetBranchByIdRequest} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/GetBranchByIdRequest.ts";

export const branchApi = createApi({
    reducerPath: 'branchApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['Branch'],
    endpoints: (builder) => ({

        // GET /branches/{id} (+ опциональные параметры запроса)
        // ⚠️ На сервере сейчас [FromBody] у GET — в браузере тело у GET не уходит.
        // Клиент пошлёт это как query-string. Лучше поменять контроллер на [FromQuery].
        getBranchById: builder.query<BranchDto, { id: Guid; query?: GetBranchByIdRequest }>(
            {
                query: ({ id, query }) => ({
                    url: API.BRANCH.GET_BY_ID(id),
                    method: 'get',
                    // см. комментарий выше — уходим в query params
                    params: query,
                }),
                providesTags: (res) => (res ? [{ type: 'Branch', id: res.id }] : []),
            }
        ),

        // POST /branches
        createBranch: builder.mutation<BranchDto, CreateBranchRequest>({
            query: (body) => ({
                url: API.BRANCH.CREATE,
                method: 'post',
                data: body,
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled}) {
                try {
                    const { data: created } = await queryFulfilled;

                    // Обновляем/создаём кэш по id
                    dispatch(
                        branchApi.util.upsertQueryData(
                            'getBranchById',
                            { id: created.id, query: undefined } as any,
                            created
                        )
                    );
                } catch {
                    // ошибка — кэш не трогаем
                }
            },
            invalidatesTags: (res) => (res ? [{ type: 'Branch' as const, id: res.id }] : []),
        }),

        // PUT /branches/{id}
        updateBranch: builder.mutation<BranchDto, UpdateBranchRequest>({
            query: (body) => ({
                url: API.BRANCH.UPDATE(body.id),
                method: 'put',
                data: body,
            }),
            async onQueryStarted(_dto, { dispatch, queryFulfilled }) {
                try {
                    const { data: updated } = await queryFulfilled;

                    // Обновляем by-id
                    dispatch(
                        branchApi.util.upsertQueryData(
                            'getBranchById',
                            { id: updated.id, query: undefined } as any,
                            updated
                        )
                    );
                } catch {
                    // ошибка — не обновляем кэш
                }
            },
            invalidatesTags: (res) => (res ? [{ type: 'Branch' as const, id: res.id }] : []),
        }),

        // DELETE /branches/{id}
        deleteBranch: builder.mutation<boolean, { id: Guid }>({
            query: ({ id }) => ({
                url: API.BRANCH.DELETE(id),
                method: 'delete',
            }),
            async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
                try {
                    const { data: ok } = await queryFulfilled;
                    if (!ok) return;

                    // Инвалидируем тег ветки — зависящие запросы перезагрузятся
                    dispatch(branchApi.util.invalidateTags([{ type: 'Branch' as const, id }]));
                } catch {
                    // ошибка — кэш не трогаем
                }
            },
        }),

    }),
});

export const {
    useGetBranchByIdQuery,
    useCreateBranchMutation,
    useUpdateBranchMutation,
    useDeleteBranchMutation,
} = branchApi;
