import type { GetModbusDeviceByIdRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/GetModbusDeviceByIdRequest.ts";
import type { ModbusDeviceDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/ModbusDeviceDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
export interface GetModbusDeviceByIdQuery {
    id: string; // Guid
    request: GetModbusDeviceByIdRequest;
}

export type GetModbusDeviceByIdQueryResponse = ApiResponse<ModbusDeviceDto>;
