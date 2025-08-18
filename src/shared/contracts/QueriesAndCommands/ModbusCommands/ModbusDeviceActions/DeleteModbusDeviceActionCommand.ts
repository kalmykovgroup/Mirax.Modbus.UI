import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteModbusDeviceActionCommand {
    actionId: string; // Guid
}

export type DeleteModbusDeviceActionCommandResponse = ApiResponse<boolean>;
