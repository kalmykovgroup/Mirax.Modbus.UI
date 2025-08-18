import type { ModbusDeviceActionScriptUsingFeatureDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionScriptUsingFeatures/ModbusDeviceActionScriptUsingFeatureDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface GetAllModbusDeviceActionScriptUsingFeatureQuery {
    modbusDeviceActionId: string; // Guid
}

export type GetAllModbusDeviceActionScriptUsingFeatureQueryResponse = ApiResponse<ModbusDeviceActionScriptUsingFeatureDto[]>;
