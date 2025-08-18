import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteStepCommand {
    stepId: string; // Guid
}

export type DeleteStepCommandResponse = ApiResponse<boolean>;