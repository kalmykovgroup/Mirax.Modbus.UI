// ResumeBranchSignalRequest.ts
import type {Guid} from "@shared/contracts/Dtos/Helpers/Guid.ts";

export interface ResumeBranchSignalRequest {
    runId?: string;
    scenarioId: Guid;  // Guid
    branchId: Guid;    // Guid
}