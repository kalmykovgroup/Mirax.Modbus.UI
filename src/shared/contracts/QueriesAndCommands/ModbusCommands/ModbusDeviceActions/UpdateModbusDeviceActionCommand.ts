import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
import type {
    UpdateModbusDeviceActionRequest
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/UpdateModbusDeviceActionRequest.ts";
import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionDto.ts";

export interface UpdateModbusDeviceActionCommand {
    request: UpdateModbusDeviceActionRequest;
}

export type UpdateModbusDeviceActionCommandResponse = ApiResponse<ModbusDeviceActionDto>;
