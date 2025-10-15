// StopScenarioSignalRequest.ts
import type {Guid} from "@app/lib/types/Guid.ts";
import type {ScenarioStopMode} from "@scenario/shared/contracts/server/types/ScenarioEngine/ScenarioStopMode.ts";

export interface StopScenarioSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
    mode: ScenarioStopMode;
}