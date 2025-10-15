// ResumeBranchSignalRequest.ts
import type {Guid} from "@app/lib/types/Guid.ts";

export interface ResumeBranchSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
    branchId: Guid;    // Guid
}