import type { CreateModbusDeviceParameterRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceParameters/CreateModbusDeviceParameterRequest.ts";
import type { ModbusDeviceParameterDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceParameters/ModbusDeviceParameterDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface CreateModbusParameterCommand {
    request: CreateModbusDeviceParameterRequest;
}

export type CreateModbusParameterCommandResponse = ApiResponse<ModbusDeviceParameterDto>;
