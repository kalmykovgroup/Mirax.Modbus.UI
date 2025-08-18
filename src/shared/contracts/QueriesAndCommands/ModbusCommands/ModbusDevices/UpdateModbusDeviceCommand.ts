import type { UpdateModbusDeviceRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/UpdateModbusDeviceRequest.ts";
import type { ModbusDeviceDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/ModbusDeviceDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
export interface UpdateModbusDeviceCommand {
    request: UpdateModbusDeviceRequest;
}

export type UpdateModbusDeviceCommandResponse = ApiResponse<ModbusDeviceDto>;
