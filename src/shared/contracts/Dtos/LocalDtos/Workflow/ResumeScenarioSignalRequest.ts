// ResumeScenarioSignalRequest.ts
import type {Guid} from "@app/lib/types/Guid.ts";

export interface ResumeScenarioSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
}