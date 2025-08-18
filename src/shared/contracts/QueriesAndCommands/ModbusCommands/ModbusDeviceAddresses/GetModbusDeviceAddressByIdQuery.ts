import type { ModbusDeviceAddressDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type { ApiResponse } from "@shared/contracts/Dtos/CommonDtos/ApiResponse.ts";

export interface GetModbusDeviceAddressByIdQuery {
    addressId: string; // Guid
}

export type GetModbusDeviceAddressByIdQueryResponse = ApiResponse<ModbusDeviceAddressDto>;
