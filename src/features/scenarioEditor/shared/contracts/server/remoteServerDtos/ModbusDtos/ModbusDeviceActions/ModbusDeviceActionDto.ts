import type {ModbusActionType} from "@scenario/shared/contracts/server/types/Api.Shared/ModbusActionType.ts";
import type {BaseActionDto} from "@scenario/shared/contracts/server/remoteServerDtos/CommonDtos/BaseActionDto.ts";
import type {
    ModbusDeviceActionParameterDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionParameterDto.ts";

export interface ModbusDeviceActionDto extends BaseActionDto {
    /** Тип modbus-действия (None, IdentificationCheck, SerialNumber, ...). */
    modbusActionType: ModbusActionType;

    /** Id шаблона устройства, которому принадлежит действие. */
    modbusDeviceTemplateId: string; // Guid

    /** Параметры, участвующие в действии. */
    modbusDeviceActionParameters: ModbusDeviceActionParameterDto[];
}
