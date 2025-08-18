import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { StepBaseDto } from "@shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts";

export interface GetStepsByBranchQuery {
    branchId: string; // Guid
}

export type GetStepsByBranchQueryResponse = ApiResponse<StepBaseDto[]>;