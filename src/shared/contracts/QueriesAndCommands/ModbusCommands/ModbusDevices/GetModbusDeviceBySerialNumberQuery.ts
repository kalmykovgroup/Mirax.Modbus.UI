import type { GetModbusDeviceBySerialNumberRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/GetModbusDeviceBySerialNumberRequest.ts";
import type { ModbusDeviceDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/ModbusDeviceDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
export interface GetModbusDeviceBySerialNumberQuery {
    serialNumber: string;
    request: GetModbusDeviceBySerialNumberRequest;
}

export type GetModbusDeviceBySerialNumberQueryResponse = ApiResponse<ModbusDeviceDto>;
