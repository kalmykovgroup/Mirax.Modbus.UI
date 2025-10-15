import type {
    CreateModbusDeviceAddressRequest
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceAddresses/CreateModbusDeviceAddressRequest.ts";

export interface CreateModbusDeviceRequest {
    name: string;
    serialNumber?: string | null;
    description?: string | null;
    modbusDeviceAddress: CreateModbusDeviceAddressRequest;
    modbusDeviceTemplateId: string; // Guid
}
