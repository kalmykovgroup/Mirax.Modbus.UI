import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteSystemActionScriptUsingFeatureCommand {
    id: string; // Guid
}

export type DeleteSystemActionScriptUsingFeatureCommandResponse = ApiResponse<boolean>;