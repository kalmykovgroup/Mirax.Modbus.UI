import type {
    UpdateModbusDeviceAddressRequest
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/UpdateModbusDeviceAddressRequest.ts";

export interface UpdateModbusDeviceRequest {
    id: string;
    name: string;
    serialNumber?: string | null;
    description?: string | null;
    modbusDeviceAddressId: string;
    modbusDeviceAddress: UpdateModbusDeviceAddressRequest;
}
