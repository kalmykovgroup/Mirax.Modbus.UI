import type { ScriptUsingFeatureDto } from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";
import type { SystemActionDto } from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/SystemActions/SystemActionDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface SystemActionScriptUsingFeatureDto {
    scriptUsingFeatureId: Guid;
    systemActionId: Guid;
    scriptUsingFeature: ScriptUsingFeatureDto;
    systemAction: SystemActionDto;
}
