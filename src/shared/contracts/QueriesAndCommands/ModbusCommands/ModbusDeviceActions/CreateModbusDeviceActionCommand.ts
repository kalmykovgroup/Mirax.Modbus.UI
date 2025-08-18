import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type {
    CreateModbusDeviceActionRequest
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/CreateModbusDeviceActionRequest.ts";
import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionDto.ts";

export interface CreateModbusDeviceActionCommand {
    request: CreateModbusDeviceActionRequest;
}

export type CreateModbusDeviceActionCommandResponse = ApiResponse<ModbusDeviceActionDto>;
