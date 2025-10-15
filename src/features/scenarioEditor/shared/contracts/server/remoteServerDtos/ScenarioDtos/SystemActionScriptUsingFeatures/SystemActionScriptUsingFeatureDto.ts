import type { ScriptUsingFeatureDto } from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";
import type { SystemActionDto } from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/SystemActions/SystemActionDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface SystemActionScriptUsingFeatureDto {
    scriptUsingFeatureId: Guid;
    systemActionId: Guid;
    scriptUsingFeature: ScriptUsingFeatureDto;
    systemAction: SystemActionDto;
}
