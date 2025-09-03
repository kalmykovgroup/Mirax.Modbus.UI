import type {ActionParameterPurpose} from "@shared/contracts/Types/Api.Shared/ActionParameterPurpose.ts";
import type {
    ModbusDeviceParameterDto
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceParameters/ModbusDeviceParameterDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface ModbusDeviceActionParameterDto {
    id: Guid; // Guid
    modbusDeviceParameterId: string; // Guid
    modbusDeviceParameter: ModbusDeviceParameterDto;
    value?: string | null;
    /** Порядок выполнения в Action. Меньшее значение = раньше. */
    order: number;
    /** Назначение параметра в действии (чтение или запись). */
    purpose: ActionParameterPurpose;
}
