import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionDto.ts";
import type {
    GetAllModbusDeviceActionsRequest
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/GetAllModbusDeviceActionsRequest.ts";

export interface GetAllModbusDeviceActionsQuery {
    request: GetAllModbusDeviceActionsRequest;
}

export type GetAllModbusDeviceActionsQueryResponse = ApiResponse<ModbusDeviceActionDto[]>;
