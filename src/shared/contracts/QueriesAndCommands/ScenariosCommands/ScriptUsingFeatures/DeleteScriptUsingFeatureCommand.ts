import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteScriptUsingFeatureCommand {
    id: string; // Guid
}

export type DeleteScriptUsingFeatureCommandResponse = ApiResponse<boolean>;