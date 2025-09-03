// src/shared/contracts/Dtos/Workflow/RunScenarioResponse.ts


import type {Guid} from "@shared/contracts/Dtos/Helpers/Guid.ts";
import type {DeviceSessionConfig} from "@shared/contracts/Dtos/LocalDtos/ScenarioEngine/DeviceSessionConfig.ts";

export interface RunScenarioResponse {
    workflowId: string;
    runId: string;
    scenarioId: Guid;
    sessions: DeviceSessionConfig[];
}