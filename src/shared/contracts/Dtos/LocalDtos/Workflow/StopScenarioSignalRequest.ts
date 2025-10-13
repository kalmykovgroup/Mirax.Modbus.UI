// StopScenarioSignalRequest.ts
import type {Guid} from "@app/lib/types/Guid.ts";
import type {ScenarioStopMode} from "@shared/contracts/Types/ScenarioEngine/ScenarioStopMode.ts";

export interface StopScenarioSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
    mode: ScenarioStopMode;
}