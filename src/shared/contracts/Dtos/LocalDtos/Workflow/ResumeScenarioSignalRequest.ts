// ResumeScenarioSignalRequest.ts
import type {Guid} from "@shared/contracts/Dtos/Helpers/Guid.ts";

export interface ResumeScenarioSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
}