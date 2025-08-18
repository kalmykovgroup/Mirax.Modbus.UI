import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreateStepRequest } from "@shared/contracts/Dtos/ScenarioDtos/Steps/CreateStepRequest.ts";
import type { StepBaseDto } from "@shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts";

export interface CreateStepCommand {
    request: CreateStepRequest;
}

export type CreateStepCommandResponse = ApiResponse<StepBaseDto>;