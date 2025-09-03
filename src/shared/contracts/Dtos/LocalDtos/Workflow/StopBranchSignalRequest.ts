// StopBranchSignalRequest.ts
import {ScenarioStopMode} from "@shared/contracts/Types/Api.Shared/ScenarioEngine/ScenarioStopMode.ts";
import type {Guid} from "@shared/contracts/Dtos/Helpers/Guid.ts";

export interface StopBranchSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
    branchId: Guid;    // Guid
    mode: ScenarioStopMode;
}