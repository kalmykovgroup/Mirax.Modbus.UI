import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteModbusDeviceActionParameterCommand {
    id: string; // Guid
}

export type DeleteModbusDeviceActionParameterCommandResponse = ApiResponse<boolean>;
