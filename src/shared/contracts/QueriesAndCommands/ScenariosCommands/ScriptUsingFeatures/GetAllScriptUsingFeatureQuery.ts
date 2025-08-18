import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type { ScriptUsingFeatureDto } from "@shared/contracts/Dtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";

export interface GetAllScriptUsingFeatureQuery {}

export type GetAllScriptUsingFeatureQueryResponse = ApiResponse<ScriptUsingFeatureDto[]>;