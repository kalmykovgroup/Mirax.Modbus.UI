// src/shared/api/stepRelationApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './base/baseQuery';

import { API } from '@shared/contracts/endpoints.ts';
import type { Guid } from '@app/lib/types/Guid';

import type { StepRelationDto } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/StepRelations/StepRelationDto.ts';
import type { CreateStepRelationRequest } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/StepRelations/CreateStepRelationRequest.ts';
import type { UpdateStepRelationRequest } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/StepRelations/UpdateStepRelationRequest.ts';

export const stepRelationApi = createApi({
    reducerPath: 'stepRelationApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['StepRelation', 'StepRelationList'],
    endpoints: (builder) => ({

        // GET /step-relations (в контроллере: StepRelationRoutes.Controller.All)
        getAllStepRelations: builder.query<StepRelationDto[], void>({
            query: () => ({
                url: API.STEP_RELATION.ALL,
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(r => ({ type: 'StepRelation' as const, id: r.id })),
                        { type: 'StepRelationList' as const, id: 'ALL' },
                    ]
                    : [{ type: 'StepRelationList' as const, id: 'ALL' }],
        }),

        // POST /step-relations
        addStepRelation: builder.mutation<StepRelationDto, CreateStepRelationRequest>({
            query: (body) => ({
                url: API.STEP_RELATION.CREATE,
                method: 'post',
                data: body,
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: created } = await queryFulfilled;

                    // Подмешиваем в активные кэши списков
                    const listArgs = stepRelationApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getAllStepRelations'
                    );
                    for (const args of listArgs) {
                        dispatch(
                            stepRelationApi.util.updateQueryData('getAllStepRelations', args, (draft) => {
                                if (!draft.some(x => x.id === created.id)) draft.push(created);
                            })
                        );
                    }

                    // Кладём by-id (если когда-то добавишь getById)
                    dispatch(
                        stepRelationApi.util.upsertQueryData(
                            // @ts-expect-error локальный кэш на будущее
                            'getStepRelationById',
                            { id: created.id } as any,
                            created
                        )
                    );
                } catch {
                    // ошибка — кэш не трогаем
                }
            },
            invalidatesTags: (res) =>
                res
                    ? [
                        { type: 'StepRelation' as const, id: res.id },
                        { type: 'StepRelationList' as const, id: 'ALL' },
                    ]
                    : [{ type: 'StepRelationList' as const, id: 'ALL' }],
        }),

        // PUT /step-relations/{id}
        updateStepRelation: builder.mutation<StepRelationDto, UpdateStepRelationRequest>({
            query: (body) => ({
                url: API.STEP_RELATION.UPDATE(body.id as Guid),
                method: 'put',
                data: body,
            }),
            async onQueryStarted(_dto, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: updated } = await queryFulfilled;

                    // Обновляем все активные кэши списков
                    const listArgs = stepRelationApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getAllStepRelations'
                    );
                    for (const args of listArgs) {
                        dispatch(
                            stepRelationApi.util.updateQueryData('getAllStepRelations', args, (draft) => {
                                const i = draft.findIndex(x => x.id === updated.id);
                                if (i !== -1) draft[i] = updated;
                            })
                        );
                    }

                    // Обновляем by-id (если появится getById)
                    dispatch(
                        stepRelationApi.util.upsertQueryData(
                            // @ts-expect-error локальный кэш на будущее
                            'getStepRelationById',
                            { id: updated.id } as any,
                            updated
                        )
                    );
                } catch {
                    // ошибка — кэш не трогаем
                }
            },
            invalidatesTags: (res) =>
                res
                    ? [
                        { type: 'StepRelation' as const, id: res.id },
                        { type: 'StepRelationList' as const, id: 'ALL' },
                    ]
                    : [{ type: 'StepRelationList' as const, id: 'ALL' }],
        }),

        // DELETE /step-relations/{id}
        deleteStepRelation: builder.mutation<boolean, { id: Guid }>({
            query: ({ id }) => ({
                url: API.STEP_RELATION.DELETE(id),
                method: 'delete',
            }),
            async onQueryStarted({ id }, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: ok } = await queryFulfilled;
                    if (!ok) return;

                    // Удаляем из активных кэшей списков
                    const listArgs = stepRelationApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getAllStepRelations'
                    );
                    for (const args of listArgs) {
                        dispatch(
                            stepRelationApi.util.updateQueryData('getAllStepRelations', args, (draft) => {
                                const i = draft.findIndex(x => x.id === id);
                                if (i !== -1) draft.splice(i, 1);
                            })
                        );
                    }

                    // Инвалидируем тег
                    dispatch(stepRelationApi.util.invalidateTags([{ type: 'StepRelation', id } as const]));
                } catch {
                    // ошибка — кэш не трогаем
                }
            },
        }),

    }),
});

export const {
    useGetAllStepRelationsQuery,
    useAddStepRelationMutation,
    useUpdateStepRelationMutation,
    useDeleteStepRelationMutation,
} = stepRelationApi;
