import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type {
    GetModbusDeviceActionByIdRequest
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/GetModbusDeviceActionByIdRequest.ts";
import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionDto.ts";

export interface GetModbusDeviceActionByIdQuery {
    id: string; // Guid
    request: GetModbusDeviceActionByIdRequest;
}

export type GetModbusDeviceActionByIdQueryResponse = ApiResponse<ModbusDeviceActionDto>;
