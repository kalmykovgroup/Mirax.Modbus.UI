import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type {
    CreateModbusDeviceActionParameterRequest
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActions/CreateModbusDeviceActionParameterRequest.ts";
import type {
    ModbusDeviceActionParameterDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActions/ModbusDeviceActionParameterDto.ts";

export interface CreateModbusDeviceActionParameterCommand {
    request: CreateModbusDeviceActionParameterRequest;
}

export type CreateModbusDeviceActionParameterCommandResponse = ApiResponse<ModbusDeviceActionParameterDto>;

