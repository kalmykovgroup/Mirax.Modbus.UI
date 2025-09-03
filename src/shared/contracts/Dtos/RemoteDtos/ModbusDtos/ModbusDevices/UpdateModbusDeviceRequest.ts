import type {
    UpdateModbusDeviceAddressRequest
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceAddresses/UpdateModbusDeviceAddressRequest.ts";

export interface UpdateModbusDeviceRequest {
    id: string;
    name: string;
    serialNumber?: string | null;
    description?: string | null;
    modbusDeviceAddressId: string;
    modbusDeviceAddress: UpdateModbusDeviceAddressRequest;
}
