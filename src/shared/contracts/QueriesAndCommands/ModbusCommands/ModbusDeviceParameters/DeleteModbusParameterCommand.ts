import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface DeleteModbusParameterCommand {
    id: string; // Guid
}

export type DeleteModbusParameterCommandResponse = ApiResponse<boolean>;
