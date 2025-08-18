import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { StepRelationDto } from "@shared/contracts/Dtos/ScenarioDtos/StepRelations/StepRelationDto.ts";

export interface GetStepRelationByIdQuery {
    stepRelationId: string; // Guid
}

export type GetStepRelationByIdQueryResponse = ApiResponse<StepRelationDto>;