import type { UpdateModbusDeviceParameterRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceParameters/UpdateModbusDeviceParameterRequest.ts";
import type { ModbusDeviceParameterDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceParameters/ModbusDeviceParameterDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface UpdateModbusParameterCommand {
    request: UpdateModbusDeviceParameterRequest;
}

export type UpdateModbusParameterCommandResponse = ApiResponse<ModbusDeviceParameterDto>;
