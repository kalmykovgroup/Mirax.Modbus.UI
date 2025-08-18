import type { CreateModbusDeviceRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/CreateModbusDeviceRequest.ts";
import type { ModbusDeviceDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/ModbusDeviceDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface CreateModbusDeviceCommand {
    request: CreateModbusDeviceRequest;
}

export type CreateModbusDeviceCommandResponse = ApiResponse<ModbusDeviceDto>;
