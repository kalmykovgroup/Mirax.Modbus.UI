import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { StepBaseDto } from "@shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts";

export interface GetStepByIdQuery {
    stepId: string; // Guid
}

export type GetStepByIdQueryResponse = ApiResponse<StepBaseDto>;