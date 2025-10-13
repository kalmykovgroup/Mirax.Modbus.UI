// PauseScenarioSignalRequest.ts
import type {Guid} from "@app/lib/types/Guid.ts";

export interface PauseScenarioSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
}