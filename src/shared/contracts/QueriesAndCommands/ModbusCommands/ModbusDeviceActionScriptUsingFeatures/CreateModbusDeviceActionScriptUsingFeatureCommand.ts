import type { CreateModbusDeviceActionScriptUsingFeatureRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionScriptUsingFeatures/CreateModbusDeviceActionScriptUsingFeatureRequest.ts";
import type { ModbusDeviceActionScriptUsingFeatureDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionScriptUsingFeatures/ModbusDeviceActionScriptUsingFeatureDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface CreateModbusDeviceActionScriptUsingFeatureCommand {
    request: CreateModbusDeviceActionScriptUsingFeatureRequest;
}

export type CreateModbusDeviceActionScriptUsingFeatureCommandResponse = ApiResponse<ModbusDeviceActionScriptUsingFeatureDto>;
