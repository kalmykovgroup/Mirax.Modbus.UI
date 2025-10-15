
import type {
    ScriptUsingFeatureDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";
import type {
    ModbusDeviceActionDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceActions/ModbusDeviceActionDto.ts";

export interface ModbusDeviceActionScriptUsingFeatureDto {
    scriptUsingFeatureId: string; // Guid
    modbusDeviceActionId: string; // Guid

    scriptUsingFeature: ScriptUsingFeatureDto;
    modbusDeviceAction: ModbusDeviceActionDto;
}
