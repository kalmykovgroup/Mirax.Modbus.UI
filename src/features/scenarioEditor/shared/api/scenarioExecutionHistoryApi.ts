import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/baseShared/api/baseQuery.ts';
import { API } from '@app/providers/endpoints.ts';
import type { Guid } from '@app/lib/types/Guid.ts';
import type {
    ScenarioExecutionHistoryDto
} from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioExecutionHistoryDto.ts';
import type {
    ScenarioRecoveryLogDto
} from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioRecoveryLogDto.ts';
import type {
    ScenarioExecutionStatus
} from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioExecutionStatus.ts';

export interface GetHistoryByScenarioIdParams {
    scenarioId: Guid;
    status?: ScenarioExecutionStatus;
}

export interface GetHistoryByWorkflowIdParams {
    workflowId: string;
}

export interface UpdateStatusCommand {
    id: Guid;
    status: ScenarioExecutionStatus;
    errorMessage?: string;
    errorDetails?: string;
}

export interface GetRecoveryLogsByScenarioIdParams {
    scenarioId: Guid;
}

export const scenarioExecutionHistoryApi = createApi({
    reducerPath: 'scenarioExecutionHistoryApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['ExecutionHistory', 'RecoveryLog'],
    endpoints: (builder) => ({
        // ======== GET ALL EXECUTION HISTORY ========
        getAllExecutionHistory: builder.query<ScenarioExecutionHistoryDto[], void>({
            query: () => ({
                url: API.SCENARIO_EXECUTION_HISTORY.ALL,
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(h => ({ type: 'ExecutionHistory' as const, id: h.id })),
                        { type: 'ExecutionHistory' as const, id: 'LIST' }
                    ]
                    : [{ type: 'ExecutionHistory' as const, id: 'LIST' }]
        }),

        // ======== GET ACTIVE EXECUTION HISTORY ========
        getActiveExecutionHistory: builder.query<ScenarioExecutionHistoryDto[], void>({
            query: () => ({
                url: API.SCENARIO_EXECUTION_HISTORY.ACTIVE,
                method: 'get',
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(h => ({ type: 'ExecutionHistory' as const, id: h.id })),
                        { type: 'ExecutionHistory' as const, id: 'ACTIVE' }
                    ]
                    : [{ type: 'ExecutionHistory' as const, id: 'ACTIVE' }]
        }),

        // ======== GET HISTORY BY SCENARIO ID ========
        getExecutionHistoryByScenarioId: builder.query<ScenarioExecutionHistoryDto[], GetHistoryByScenarioIdParams>({
            query: ({ scenarioId, status }) => ({
                url: API.SCENARIO_EXECUTION_HISTORY.BY_SCENARIO_ID(scenarioId),
                method: 'get',
                params: status !== undefined ? { status } : undefined,
            }),
            providesTags: (result, error, { scenarioId }) =>
                result
                    ? [
                        ...result.map(h => ({ type: 'ExecutionHistory' as const, id: h.id })),
                        { type: 'ExecutionHistory' as const, id: `SCENARIO_${scenarioId}` }
                    ]
                    : [{ type: 'ExecutionHistory' as const, id: `SCENARIO_${scenarioId}` }]
        }),

        // ======== GET HISTORY BY WORKFLOW ID ========
        getExecutionHistoryByWorkflowId: builder.query<ScenarioExecutionHistoryDto[], GetHistoryByWorkflowIdParams>({
            query: ({ workflowId }) => ({
                url: API.SCENARIO_EXECUTION_HISTORY.BY_WORKFLOW_ID(workflowId),
                method: 'get',
            }),
            providesTags: (result, error, { workflowId }) =>
                result
                    ? [
                        ...result.map(h => ({ type: 'ExecutionHistory' as const, id: h.id })),
                        { type: 'ExecutionHistory' as const, id: `WORKFLOW_${workflowId}` }
                    ]
                    : [{ type: 'ExecutionHistory' as const, id: `WORKFLOW_${workflowId}` }]
        }),

        // ======== UPDATE STATUS ========
        updateExecutionHistoryStatus: builder.mutation<void, UpdateStatusCommand>({
            query: (command) => ({
                url: API.SCENARIO_EXECUTION_HISTORY.UPDATE_STATUS,
                method: 'put',
                data: command,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'ExecutionHistory' as const, id },
                { type: 'ExecutionHistory' as const, id: 'LIST' },
                { type: 'ExecutionHistory' as const, id: 'ACTIVE' }
            ]
        }),

        // ======== GET RECOVERY LOGS BY SCENARIO ID ========
        getRecoveryLogsByScenarioId: builder.query<ScenarioRecoveryLogDto[], GetRecoveryLogsByScenarioIdParams>({
            query: ({ scenarioId }) => ({
                url: API.SCENARIO_RECOVERY_LOG.BY_SCENARIO_ID(scenarioId),
                method: 'get',
            }),
            providesTags: (result, error, { scenarioId }) =>
                result
                    ? [
                        ...result.map(log => ({ type: 'RecoveryLog' as const, id: log.id })),
                        { type: 'RecoveryLog' as const, id: `SCENARIO_${scenarioId}` }
                    ]
                    : [{ type: 'RecoveryLog' as const, id: `SCENARIO_${scenarioId}` }]
        }),
    }),
});

export const {
    useGetAllExecutionHistoryQuery,
    useGetActiveExecutionHistoryQuery,
    useGetExecutionHistoryByScenarioIdQuery,
    useGetExecutionHistoryByWorkflowIdQuery,
    useUpdateExecutionHistoryStatusMutation,
    useGetRecoveryLogsByScenarioIdQuery,
} = scenarioExecutionHistoryApi;
