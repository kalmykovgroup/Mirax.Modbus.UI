// StopBranchSignalRequest.ts
import type {Guid} from "@app/lib/types/Guid.ts";
import type {ScenarioStopMode} from "@shared/contracts/Types/ScenarioEngine/ScenarioStopMode.ts";

export interface StopBranchSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
    branchId: Guid;    // Guid
    mode: ScenarioStopMode;
}