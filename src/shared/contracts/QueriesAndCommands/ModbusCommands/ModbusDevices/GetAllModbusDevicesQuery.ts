import type { GetAllModbusDevicesRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/GetAllModbusDevicesRequest.ts";
import type { ModbusDeviceDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDevices/ModbusDeviceDto.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";
export interface GetAllModbusDevicesQuery {
    request: GetAllModbusDevicesRequest;
}

export type GetAllModbusDevicesQueryResponse = ApiResponse<ModbusDeviceDto[]>;
