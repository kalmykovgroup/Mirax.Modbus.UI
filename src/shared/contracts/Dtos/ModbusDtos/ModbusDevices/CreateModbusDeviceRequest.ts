import type {
    CreateModbusDeviceAddressRequest
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/CreateModbusDeviceAddressRequest.ts";

export interface CreateModbusDeviceRequest {
    name: string;
    serialNumber?: string | null;
    description?: string | null;
    modbusDeviceAddress: CreateModbusDeviceAddressRequest;
    modbusDeviceTemplateId: string; // Guid
}
