import type {ActionParameterPurpose} from "@scenario/shared/contracts/server/types/Api.Shared/ActionParameterPurpose.ts";
import type {
    ModbusDeviceParameterDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceParameters/ModbusDeviceParameterDto.ts";
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
