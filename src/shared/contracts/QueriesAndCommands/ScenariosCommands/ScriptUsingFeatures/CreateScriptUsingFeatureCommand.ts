import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { CreateScriptUsingFeatureRequest } from "@shared/contracts/Dtos/ScenarioDtos/ScriptUsingFeatures/CreateScriptUsingFeatureRequest.ts";
import type { ScriptUsingFeatureDto } from "@shared/contracts/Dtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";

export interface CreateScriptUsingFeatureCommand {
    request: CreateScriptUsingFeatureRequest;
}

export type CreateScriptUsingFeatureCommandResponse = ApiResponse<ScriptUsingFeatureDto>;