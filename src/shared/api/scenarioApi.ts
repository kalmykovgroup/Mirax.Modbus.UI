// src/shared/api/scenarioApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { axiosBaseQuery } from './base/baseQuery'

// Контракты (развёрнутые типы, без ApiResponse<T> — baseQuery уже разворачивает):
import type { ScenarioDto } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/ScenarioDto'
import type { GetAllScenariosRequest } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/GetAllScenariosRequest'
import type { GetScenarioByIdRequest } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/GetScenarioByIdRequest'
import type { CreateScenarioRequest } from '@/shared/contracts/Dtos/ScenarioDtos/Scenarios/CreateScenarioRequest'

// Единый реестр эндпоинтов (как в примере с authApi)
import { API } from '@shared/contracts/endpoints.ts'
import type {UpdateScenarioRequest} from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/UpdateScenarioRequest.ts";

export const scenarioApi = createApi({
    reducerPath: 'scenarioApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['Scenario', 'ScenarioList'],
    endpoints: (builder) => ({
        // ======== SCENARIOS CRUD ========

        // GET /scenarios/all?{...}
        // Возвращает список ScenarioDto
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
        // Возвращает один ScenarioDto
        getScenarioById: builder.query<ScenarioDto, { id: string; query?: GetScenarioByIdRequest }>({
            query: ({ id, query }) => ({
                url: API.SCENARIO.GET_BY_ID(id),
                method: 'get',
                params: query
            }),
            providesTags: (res) => res ? [{ type: 'Scenario', id: res.id }] : []
        }),

        // POST /scenarios
        // Создаёт и возвращает ScenarioDto
        addScenario: builder.mutation<ScenarioDto, CreateScenarioRequest>({
            query: (body) => ({
                url: API.SCENARIO.CREATE,
                method: 'post',
                data: body
            }),
            invalidatesTags: [{ type: 'ScenarioList', id: 'ALL' }]
        }),

        // PUT /scenarios/{id}
        // Обновляет и возвращает ScenarioDto
        updateScenario: builder.mutation<ScenarioDto, UpdateScenarioRequest>({
            query: (body) => ({
                url: API.SCENARIO.UPDATE(body.id),
                method: 'put',
                data: body
            }),
            invalidatesTags: (_res, _err, dto) => [
                { type: 'Scenario', id: dto.id },
                { type: 'ScenarioList', id: 'ALL' }
            ]
        }),

        // DELETE /scenarios/{id}
        // Возвращает true/false
        deleteScenario: builder.mutation<boolean, { id: string }>({
            query: ({ id }) => ({
                url: API.SCENARIO.DELETE(id),
                method: 'delete'
            }),
            invalidatesTags: (_res, _err, arg) => [
                { type: 'Scenario', id: arg.id },
                { type: 'ScenarioList', id: 'ALL' }
            ]
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
