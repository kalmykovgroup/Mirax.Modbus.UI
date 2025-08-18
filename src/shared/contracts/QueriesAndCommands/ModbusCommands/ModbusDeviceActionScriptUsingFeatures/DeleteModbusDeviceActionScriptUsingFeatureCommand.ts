import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteModbusDeviceActionScriptUsingFeatureCommand {
    id: string; // Guid
}

export type DeleteModbusDeviceActionScriptUsingFeatureCommandResponse = ApiResponse<boolean>;
