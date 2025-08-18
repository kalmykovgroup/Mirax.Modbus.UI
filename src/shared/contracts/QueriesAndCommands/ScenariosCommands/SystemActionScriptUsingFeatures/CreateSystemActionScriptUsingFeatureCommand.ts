import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreateSystemActionScriptUsingFeatureRequest } from "@shared/contracts/Dtos/ScenarioDtos/SystemActionScriptUsingFeatures/CreateSystemActionScriptUsingFeatureRequest.ts";
import type { SystemActionScriptUsingFeatureDto } from "@shared/contracts/Dtos/ScenarioDtos/SystemActionScriptUsingFeatures/SystemActionScriptUsingFeatureDto.ts";

export interface CreateSystemActionScriptUsingFeatureCommand {
    request: CreateSystemActionScriptUsingFeatureRequest;
}

export type CreateSystemActionScriptUsingFeatureCommandResponse = ApiResponse<SystemActionScriptUsingFeatureDto>;