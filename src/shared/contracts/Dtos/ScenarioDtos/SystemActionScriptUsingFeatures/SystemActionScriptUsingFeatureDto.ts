import type { ScriptUsingFeatureDto } from "@shared/contracts/Dtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";
import type { SystemActionDto } from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/SystemActionDto.ts";

export interface SystemActionScriptUsingFeatureDto {
    scriptUsingFeatureId: string;
    systemActionId: string;
    scriptUsingFeature: ScriptUsingFeatureDto;
    systemAction: SystemActionDto;
}
