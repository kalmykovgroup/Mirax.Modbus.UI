import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionDto.ts";
import type {
    ScriptUsingFeatureDto
} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";

export interface ModbusDeviceActionScriptUsingFeatureDto {
    scriptUsingFeatureId: string; // Guid
    modbusDeviceActionId: string; // Guid

    scriptUsingFeature: ScriptUsingFeatureDto;
    modbusDeviceAction: ModbusDeviceActionDto;
}
