import type {ModbusActionType} from "@shared/contracts/Types/Api.Shared/ModbusActionType.ts";
import type {BaseActionDto} from "@shared/contracts/Dtos/RemoteDtos/CommonDtos/BaseActionDto.ts";
import type {
    ModbusDeviceActionParameterDto
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionParameterDto.ts";

export interface ModbusDeviceActionDto extends BaseActionDto {
    /** Тип modbus-действия (None, IdentificationCheck, SerialNumber, ...). */
    modbusActionType: ModbusActionType;

    /** Id шаблона устройства, которому принадлежит действие. */
    modbusDeviceTemplateId: string; // Guid

    /** Параметры, участвующие в действии. */
    modbusDeviceActionParameters: ModbusDeviceActionParameterDto[];
}
