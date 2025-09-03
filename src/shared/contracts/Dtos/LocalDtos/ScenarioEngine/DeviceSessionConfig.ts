import type {Guid} from "@shared/contracts/Dtos/Helpers/Guid.ts";
import type {
    ModbusDeviceAddressDto
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";

export interface DeviceSessionConfig {
    sessionId: Guid;
    DeviceAddress: ModbusDeviceAddressDto;
}