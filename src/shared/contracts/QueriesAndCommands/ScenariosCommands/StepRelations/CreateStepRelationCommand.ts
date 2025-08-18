import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreateStepRelationRequest } from "@shared/contracts/Dtos/ScenarioDtos/StepRelations/CreateStepRelationRequest.ts";
import type { StepRelationDto } from "@shared/contracts/Dtos/ScenarioDtos/StepRelations/StepRelationDto.ts";

export interface CreateStepRelationCommand {
    request: CreateStepRelationRequest;
}

export type CreateStepRelationCommandResponse = ApiResponse<StepRelationDto>;