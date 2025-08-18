import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteModbusDeviceCommand {
    id: string; // Guid
}

export type DeleteModbusDeviceCommandResponse = ApiResponse<boolean>;
