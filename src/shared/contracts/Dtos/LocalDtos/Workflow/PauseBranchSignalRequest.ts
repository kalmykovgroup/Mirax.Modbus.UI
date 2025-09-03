// PauseBranchSignalRequest.ts
import type {Guid} from "@shared/contracts/Dtos/Helpers/Guid.ts";

export interface PauseBranchSignalRequest {
    runId?: string;  // Guid
    scenarioId: string;  // Guid
    branchId: Guid;    // Guid
}