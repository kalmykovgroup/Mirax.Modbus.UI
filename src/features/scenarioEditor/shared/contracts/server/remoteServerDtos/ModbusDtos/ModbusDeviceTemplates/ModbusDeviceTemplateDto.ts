import type {
    ModbusDeviceParameterDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceParameters/ModbusDeviceParameterDto.ts";
import type {
    ModbusDeviceActionDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceActions/ModbusDeviceActionDto.ts";


export interface ModbusDeviceTemplateDto {
    id: string;
    name: string;
    manufacturer?: string | null;
    description?: string | null;
    parameters?: ModbusDeviceParameterDto[] | null;
    actions?: ModbusDeviceActionDto[] | null;
}
