import type {ModbusActionType} from "@shared/contracts/Types/ModbusActionType.ts";
import type {
    ModbusDeviceActionParameterDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActions/ModbusDeviceActionParameterDto.ts";
import type {BaseActionDto} from "@shared/contracts/Dtos/CommonDtos/BaseActionDto.ts";

export interface ModbusDeviceActionDto extends BaseActionDto {
    /** Тип modbus-действия (None, IdentificationCheck, SerialNumber, ...). */
    modbusActionType: ModbusActionType;

    /** Id шаблона устройства, которому принадлежит действие. */
    modbusDeviceTemplateId: string; // Guid

    /** Параметры, участвующие в действии. */
    modbusDeviceActionParameters: ModbusDeviceActionParameterDto[];
}
