import type { GetAllModbusParametersRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceParameters/GetAllModbusParametersRequest.ts";
import type { ModbusDeviceParameterDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceParameters/ModbusDeviceParameterDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface GetAllModbusParametersQuery {
    request: GetAllModbusParametersRequest;
}

export type GetAllModbusParametersQueryResponse = ApiResponse<ModbusDeviceParameterDto[]>;
