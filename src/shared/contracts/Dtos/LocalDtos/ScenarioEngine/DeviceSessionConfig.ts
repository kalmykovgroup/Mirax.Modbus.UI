
import type {
    ModbusDeviceAddressDto
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface DeviceSessionConfig {
    sessionId: Guid;
    DeviceAddress: ModbusDeviceAddressDto;
}