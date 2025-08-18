import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
 import type { StepBaseDto } from "@shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts";
import type {UpdateStepRequest} from "@shared/contracts/Dtos/ScenarioDtos/Steps/UpdateStepRequest.ts";

export interface UpdateStepCommand {
    request: UpdateStepRequest;
}

export type UpdateStepCommandResponse = ApiResponse<StepBaseDto>;