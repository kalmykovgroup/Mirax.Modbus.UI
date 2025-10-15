import type {
    UpdateModbusDeviceAddressRequest
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceAddresses/UpdateModbusDeviceAddressRequest.ts";

export interface UpdateModbusDeviceRequest {
    id: string;
    name: string;
    serialNumber?: string | null;
    description?: string | null;
    modbusDeviceAddressId: string;
    modbusDeviceAddress: UpdateModbusDeviceAddressRequest;
}
