import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type {
    UpdateModbusDeviceActionParameterRequest
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActions/UpdateModbusDeviceActionParameterRequest.ts";
import type {
    ModbusDeviceActionParameterDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActions/ModbusDeviceActionParameterDto.ts";

export interface UpdateModbusDeviceActionParameterCommand {
    request: UpdateModbusDeviceActionParameterRequest;
}

export type UpdateModbusDeviceActionParameterCommandResponse = ApiResponse<ModbusDeviceActionParameterDto>;
