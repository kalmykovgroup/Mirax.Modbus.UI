import type {
    ModbusDeviceTemplateDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceTemplates/ModbusDeviceTemplateDto.ts";
import type {
    ModbusDeviceAddressDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";

export interface ModbusDeviceDto {
    id: string;
    name: string;
    lastSuccessfulPing?: string | null; // ISO date string
    lastFailedPing?: string | null; // ISO date string
    serialNumber?: string | null;
    description?: string | null;
    modbusDeviceAddressId: string;
    modbusDeviceTemplateId: string;
    modbusDeviceAddress: ModbusDeviceAddressDto;
    modbusDeviceTemplate: ModbusDeviceTemplateDto;
}
