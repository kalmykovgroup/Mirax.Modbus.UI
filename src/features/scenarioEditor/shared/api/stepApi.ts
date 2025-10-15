// src/shared/baseApi/stepApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/baseShared/api/baseQuery.ts';

import { API } from '@app/providers/endpoints.ts';
import type { Guid } from '@app/lib/types/Guid.ts';

import type { StepBaseDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts';
import type { CreateStepRequest } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/CreateStepRequest.ts';
import type { UpdateStepRequest } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/UpdateStepRequest.ts';
// Delete по контроллеру идёт через URL id, так что отдельный DeleteStepRequest не обязателен,
// но если у тебя он есть — можешь импортнуть и использовать в типизации параметров мутации.

// Теги: отдельные шаги и коллекции шагов по ветке
export const stepApi = createApi({
    reducerPath: 'stepApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['Step', 'BranchSteps'],
    endpoints: (builder) => ({

        // GET /steps?branchId=...
        getStepsByBranch: builder.query<StepBaseDto[], { branchId: Guid }>(
            {
                query: ({ branchId }) => ({
                    url: API.STEP.ALL(branchId), // константа вида '/baseApi/steps'
                    method: 'get',
                    params: { branchId },
                }),
                providesTags: (result, _e, arg) =>
                    result
                        ? [
                            ...result.map(s => ({ type: 'Step' as const, id: s.id })),
                            { type: 'BranchSteps' as const, id: arg.branchId },
                        ]
                        : [{ type: 'BranchSteps' as const, id: arg.branchId }],
            }
        ),

        // GET /steps/{id}
        getStepById: builder.query<StepBaseDto, { id: Guid }>({
            query: ({ id }) => ({
                url: API.STEP.BY_ID(id),
                method: 'get',
            }),
            providesTags: (res) => (res ? [{ type: 'Step', id: res.id }] : []),
        }),

        // POST /steps
        // Полиморфное создание по discriminator: type
        createStep: builder.mutation<StepBaseDto, CreateStepRequest>({
            query: (body) => ({
                url: API.STEP.CREATE,
                method: 'post',
                data: body,
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: created } = await queryFulfilled;

                    // Подмешиваем новый шаг в активные кэши списков по ветке
                    const listArgs = stepApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getStepsByBranch'
                    );

                    for (const args of listArgs) {
                        // добавляем, только если список этой же ветки
                        if ((args as { branchId: Guid }).branchId !== created.branchId) continue;

                        dispatch(
                            stepApi.util.updateQueryData('getStepsByBranch', args, (draft) => {
                                if (!draft.some(x => x.id === created.id)) draft.push(created);
                            })
                        );
                    }

                    // Обновляем/создаём кэш по id
                    dispatch(
                        stepApi.util.upsertQueryData('getStepById', { id: created.id } as any, created)
                    );
                } catch {
                    // ошибка — кэши не трогаем
                }
            },
            invalidatesTags: (res) =>
                res
                    ? [
                        { type: 'Step' as const, id: res.id },
                        { type: 'BranchSteps' as const, id: res.branchId },
                    ]
                    : [],
        }),

        // PUT /steps/{id}
        updateStep: builder.mutation<StepBaseDto, UpdateStepRequest>({
            query: (body) => ({
                url: API.STEP.UPDATE(body.id),
                method: 'put',
                data: body,
            }),
            async onQueryStarted(_dto, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: updated } = await queryFulfilled;

                    // Обновляем by-id
                    dispatch(
                        stepApi.util.upsertQueryData('getStepById', { id: updated.id } as any, updated)
                    );

                    // Обновляем все кэши списков по веткам, где этот шаг присутствует
                    const listArgs = stepApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getStepsByBranch'
                    );
                    for (const args of listArgs) {
                        dispatch(
                            stepApi.util.updateQueryData('getStepsByBranch', args, (draft) => {
                                const i = draft.findIndex(x => x.id === updated.id);
                                if (i !== -1) draft[i] = updated;
                            })
                        );
                    }
                } catch {
                    // ошибка — не обновляем кэш
                }
            },
            invalidatesTags: (res) =>
                res
                    ? [
                        { type: 'Step' as const, id: res.id },
                        { type: 'BranchSteps' as const, id: res.branchId },
                    ]
                    : [],
        }),

        // DELETE /steps/{id}
        deleteStep: builder.mutation<boolean, { id: Guid }>({
            query: ({ id }) => ({
                url: API.STEP.DELETE(id),
                method: 'delete',
            }),
            async onQueryStarted({ id }, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: ok } = await queryFulfilled;
                    if (!ok) return;

                    // Удаляем из всех активных кэшей списков
                    const listArgs = stepApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getStepsByBranch'
                    );
                    for (const args of listArgs) {
                        dispatch(
                            stepApi.util.updateQueryData('getStepsByBranch', args, (draft) => {
                                const i = draft.findIndex(x => x.id === id);
                                if (i !== -1) draft.splice(i, 1);
                            })
                        );
                    }

                    // Можно так же инвалидировать тег шага — зависимые запросы перезагрузятся
                    dispatch(stepApi.util.invalidateTags([{ type: 'Step', id } as const]));
                } catch {
                    // ошибка — кэш не трогаем
                }
            },
        }),

    }),
});

export const {
    useGetStepsByBranchQuery,
    useGetStepByIdQuery,
    useCreateStepMutation,
    useUpdateStepMutation,
    useDeleteStepMutation,
} = stepApi;
