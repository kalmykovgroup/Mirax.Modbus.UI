import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { UpdateScriptUsingFeatureRequest } from "@shared/contracts/Dtos/ScenarioDtos/ScriptUsingFeatures/UpdateScriptUsingFeatureRequest.ts";
import type { ScriptUsingFeatureDto } from "@shared/contracts/Dtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";

export interface UpdateScriptUsingFeatureCommand {
    request: UpdateScriptUsingFeatureRequest;
}

export type UpdateScriptUsingFeatureCommandResponse = ApiResponse<ScriptUsingFeatureDto>;