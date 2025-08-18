import type { CreateModbusDeviceAddressRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/CreateModbusDeviceAddressRequest.ts";
import type { ModbusDeviceAddressDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface CreateModbusDeviceAddressCommand {
    request: CreateModbusDeviceAddressRequest;
}

export type CreateModbusDeviceAddressCommandResponse = ApiResponse<ModbusDeviceAddressDto>;
