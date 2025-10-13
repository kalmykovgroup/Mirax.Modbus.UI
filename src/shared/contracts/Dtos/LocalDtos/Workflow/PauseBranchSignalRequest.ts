// PauseBranchSignalRequest.ts
import type {Guid} from "@app/lib/types/Guid.ts";

export interface PauseBranchSignalRequest {
    runId?: string;  // Guid
    scenarioId: string;  // Guid
    branchId: Guid;    // Guid
}