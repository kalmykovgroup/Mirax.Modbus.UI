import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/baseShared/api/baseQuery.ts";

// Общие типы
import { API } from "@app/providers/endpoints.ts";
import type {PauseScenarioSignalRequest} from "@scenario/shared/contracts/server/localDtos/Workflow/PauseScenarioSignalRequest.ts";
import type {
    ResumeScenarioSignalRequest
} from "@scenario/shared/contracts/server/localDtos/Workflow/ResumeScenarioSignalRequest.ts";
import type {StopScenarioSignalRequest} from "@scenario/shared/contracts/server/localDtos/Workflow/StopScenarioSignalRequest.ts";
import type {PauseBranchSignalRequest} from "@scenario/shared/contracts/server/localDtos/Workflow/PauseBranchSignalRequest.ts";
import type {ResumeBranchSignalRequest} from "@scenario/shared/contracts/server/localDtos/Workflow/ResumeBranchSignalRequest.ts";
import type {StopBranchSignalRequest} from "@scenario/shared/contracts/server/localDtos/Workflow/StopBranchSignalRequest.ts";
import type {RunScenarioResponse} from "@scenario/shared/contracts/server/localDtos/ScenarioEngine/RunScenarioResponse.ts";


export const workflowApi = createApi({
    reducerPath: "workflowApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["Workflow"],
    endpoints: (builder) => ({
        // Несмотря на GET у контроллера, по смыслу это "операция" — делаем mutation.
        runScenario: builder.mutation<RunScenarioResponse, { id: string }>({
            query: ({ id }) => ({
                url: API.WORKFLOW.RUN(id),
                method: "get",
                params: { id },
            }),
            invalidatesTags: (_res, _err, arg) => [{ type: "Workflow", id: arg.id }] as any,
        }),

        pauseScenario: builder.mutation<boolean, PauseScenarioSignalRequest>({
            query: (body) => ({
                url: API.WORKFLOW.SCENARIO_PAUSE,
                method: "post",
                data: body,
            }),
            invalidatesTags: (_r, _e, arg) => [{ type: "Workflow", id: arg.scenarioId }] as any,
        }),

        resumeScenario: builder.mutation<boolean, ResumeScenarioSignalRequest>({
            query: (body) => ({
                url: API.WORKFLOW.SCENARIO_RESUME,
                method: "post",
                data: body,
            }),
            invalidatesTags: (_r, _e, arg) => [{ type: "Workflow", id: arg.scenarioId }] as any,
        }),

        stopScenario: builder.mutation<boolean, StopScenarioSignalRequest>({
            query: (body) => ({
                url: API.WORKFLOW.SCENARIO_STOP,
                method: "post",
                data: body,
            }),
            invalidatesTags: (_r, _e, arg) => [{ type: "Workflow", id: arg.scenarioId }] as any,
        }),

        pauseBranch: builder.mutation<boolean, PauseBranchSignalRequest>({
            query: (body) => ({
                url: API.WORKFLOW.BRANCH_PAUSE,
                method: "post",
                data: body,
            }),
            invalidatesTags: (_r, _e, arg) => [{ type: "Workflow", id: `${arg.scenarioId}:${arg.branchId}` }] as any,
        }),

        resumeBranch: builder.mutation<boolean, ResumeBranchSignalRequest>({
            query: (body) => ({
                url: API.WORKFLOW.BRANCH_RESUME,
                method: "post",
                data: body,
            }),
            invalidatesTags: (_r, _e, arg) => [{ type: "Workflow", id: `${arg.scenarioId}:${arg.branchId}` }] as any,
        }),

        stopBranch: builder.mutation<boolean, StopBranchSignalRequest>({
            query: (body) => ({
                url: API.WORKFLOW.BRANCH_STOP,
                method: "post",
                data: body,
            }),
            invalidatesTags: (_r, _e, arg) => [{ type: "Workflow", id: `${arg.scenarioId}:${arg.branchId}` }] as any,
        }),
    }),
});

export const {
    useRunScenarioMutation,
    usePauseScenarioMutation,
    useResumeScenarioMutation,
    useStopScenarioMutation,
    usePauseBranchMutation,
    useResumeBranchMutation,
    useStopBranchMutation,
} = workflowApi;
