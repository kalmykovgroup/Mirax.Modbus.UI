import type { UpdateModbusDeviceAddressRequest } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/UpdateModbusDeviceAddressRequest.ts";
import type { ModbusDeviceAddressDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface UpdateModbusDeviceAddressCommand {
    request: UpdateModbusDeviceAddressRequest;
}

export type UpdateModbusDeviceAddressCommandResponse = ApiResponse<ModbusDeviceAddressDto>;
