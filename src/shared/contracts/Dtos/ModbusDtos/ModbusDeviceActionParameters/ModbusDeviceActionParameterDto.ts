import type {ActionParameterPurpose} from "@shared/contracts/Types/ActionParameterPurpose.ts";
import type {
    ModbusDeviceParameterDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceParameters/ModbusDeviceParameterDto.ts";

export interface ModbusDeviceActionParameterDto {
    id: string; // Guid
    modbusDeviceParameterId: string; // Guid
    modbusDeviceParameter: ModbusDeviceParameterDto;
    value?: string | null;
    /** Порядок выполнения в Action. Меньшее значение = раньше. */
    order: number;
    /** Назначение параметра в действии (чтение или запись). */
    purpose: ActionParameterPurpose;
}
