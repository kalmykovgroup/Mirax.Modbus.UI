import type {
    ModbusDeviceParameterDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceParameters/ModbusDeviceParameterDto.ts";

import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionDto.ts";

export interface ModbusDeviceTemplateDto {
    id: string;
    name: string;
    manufacturer?: string | null;
    description?: string | null;
    parameters?: ModbusDeviceParameterDto[] | null;
    actions?: ModbusDeviceActionDto[] | null;
}
