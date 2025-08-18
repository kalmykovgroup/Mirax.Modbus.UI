import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteStepRelationCommand {
    stepRelationId: string; // Guid
}

export type DeleteStepRelationCommandResponse = ApiResponse<boolean>;