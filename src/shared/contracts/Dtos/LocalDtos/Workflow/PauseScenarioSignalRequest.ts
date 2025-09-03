// PauseScenarioSignalRequest.ts
import type {Guid} from "@shared/contracts/Dtos/Helpers/Guid.ts";

export interface PauseScenarioSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
}