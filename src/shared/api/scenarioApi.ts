// src/shared/api/scenarioApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { axiosBaseQuery } from './base/baseQuery'

// Контракты (развёрнутые типы, без ApiResponse<T> — baseQuery уже разворачивает):
import type { ScenarioDto } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/ScenarioDto'
import type { GetAllScenariosRequest } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/GetAllScenariosRequest'
import type { GetScenarioByIdRequest } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/GetScenarioByIdRequest'
import type { CreateScenarioRequest } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/CreateScenarioRequest'
import type { UpdateScenarioRequest } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/UpdateScenarioRequest'
import { API } from '@shared/contracts/endpoints.ts'

export const scenarioApi = createApi({
    reducerPath: 'scenarioApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['Scenario', 'ScenarioList'],
    endpoints: (builder) => ({
        // ======== SCENARIOS CRUD ========

        // GET /scenarios/all?{...}
        getAllScenarios: builder.query<ScenarioDto[], GetAllScenariosRequest | void>({
            query: (params) => ({
                url: API.SCENARIO.GET_ALL,
                method: 'get',
                params
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(s => ({ type: 'Scenario' as const, id: s.id })),
                        { type: 'ScenarioList' as const, id: 'ALL' }
                    ]
                    : [{ type: 'ScenarioList' as const, id: 'ALL' }]
        }),

        // GET /scenarios/{id}?{...}
        getScenarioById: builder.query<ScenarioDto, { id: string; query?: GetScenarioByIdRequest }>({
            query: ({ id, query }) => ({
                url: API.SCENARIO.GET_BY_ID(id),
                method: 'get',
                params: query
            }),
            providesTags: (res) => (res ? [{ type: 'Scenario', id: res.id }] : [])
        }),

        // POST /scenarios — без рефетча списка, обновляем кэш вручную
        addScenario: builder.mutation<ScenarioDto, CreateScenarioRequest>({
            query: (body) => ({
                url: API.SCENARIO.CREATE,
                method: 'post',
                data: body
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: created } = await queryFulfilled

                    // Все активные кэши списка (любой набор параметров)
                    const listArgs = scenarioApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getAllScenarios'
                    )

                    // Добавляем созданный сценарий в каждый активный список (без дублей)
                    for (const args of listArgs) {
                        dispatch(
                            scenarioApi.util.updateQueryData('getAllScenarios', args, (draft) => {
                                if (!draft.some(x => x.id === created.id)) {
                                    draft.push(created)
                                    // Если нужен стабильный порядок:
                                    // draft.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
                                }
                            })
                        )
                    }

                    // Гарантированно кладём by-id в кэш (создаст, если не было)
                    dispatch(
                        scenarioApi.util.upsertQueryData(
                            'getScenarioById',
                            { id: created.id, query: undefined } as any,
                            created
                        )
                    )
                } catch {
                    // при ошибке ничего не меняем
                }
            }
        }),

        // PUT /scenarios/{id} — обновляем кэш после подтверждения сервера
        updateScenario: builder.mutation<ScenarioDto, UpdateScenarioRequest>({
            query: (body) => ({
                url: API.SCENARIO.UPDATE(body.id),
                method: 'put',
                data: body
            }),
            async onQueryStarted(_dto: UpdateScenarioRequest, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: updated } = await queryFulfilled

                    // Обновляем все активные кэши списков
                    const listArgs = scenarioApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getAllScenarios'
                    )
                    for (const args of listArgs) {
                        dispatch(
                            scenarioApi.util.updateQueryData('getAllScenarios', args, (draft) => {
                                const i = draft.findIndex(x => x.id === updated.id)
                                if (i !== -1) draft[i] = updated
                            })
                        )
                    }

                    // И by-id кэш
                    dispatch(
                        scenarioApi.util.upsertQueryData(
                            'getScenarioById',
                            { id: updated.id, query: undefined } as any,
                            updated
                        )
                    )
                } catch {
                    // сервер вернул ошибку — кэш не трогаем
                }
            }
        }),

        // DELETE /scenarios/{id} — удаляем из кэша только при успешном ответе
        deleteScenario: builder.mutation<boolean, { id: string }>({
            query: ({ id }) => ({
                url: API.SCENARIO.DELETE(id),
                method: 'delete'
            }),
            async onQueryStarted({ id }, { dispatch, queryFulfilled, getState }) {
                try {
                    const { data: ok } = await queryFulfilled
                    if (!ok) return

                    // Удаляем из всех активных кэшей списков
                    const listArgs = scenarioApi.util.selectCachedArgsForQuery(
                        getState(),
                        'getAllScenarios'
                    )
                    for (const args of listArgs) {
                        dispatch(
                            scenarioApi.util.updateQueryData('getAllScenarios', args, (draft) => {
                                const i = draft.findIndex(x => x.id === id)
                                if (i !== -1) draft.splice(i, 1)
                            })
                        )
                    }
                    // По желанию можно очистить by-id кэш (опционально):
                    // dispatch(scenarioApi.util.invalidateTags([{ type: 'Scenario', id }]))
                } catch {
                    // ошибка — не трогаем кэш
                }
            }
        })
    })
})

export const {
    useGetAllScenariosQuery,
    useGetScenarioByIdQuery,
    useAddScenarioMutation,
    useUpdateScenarioMutation,
    useDeleteScenarioMutation
} = scenarioApi
