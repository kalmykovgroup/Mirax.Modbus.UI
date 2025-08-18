import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { UpdateStepRelationRequest } from "@shared/contracts/Dtos/ScenarioDtos/StepRelations/UpdateStepRelationRequest.ts";
import type { StepRelationDto } from "@shared/contracts/Dtos/ScenarioDtos/StepRelations/StepRelationDto.ts";

export interface UpdateStepRelationCommand {
    request: UpdateStepRelationRequest;
}

export type UpdateStepRelationCommandResponse = ApiResponse<StepRelationDto>;