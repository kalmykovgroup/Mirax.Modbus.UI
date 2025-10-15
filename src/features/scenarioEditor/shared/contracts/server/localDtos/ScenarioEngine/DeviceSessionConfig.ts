
import type {
    ModbusDeviceAddressDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface DeviceSessionConfig {
    sessionId: Guid;
    DeviceAddress: ModbusDeviceAddressDto;
}