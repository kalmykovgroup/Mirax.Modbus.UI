// CreateModbusDeviceActionRequest.ts

import type {ModbusActionType} from "@shared/contracts/Types/Api.Shared/ModbusActionType.ts";
import type {
    ScriptUsingFeatureDto
} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";
import type {
    CreateModbusDeviceActionParameterRequest
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceActionParameters/CreateModbusDeviceActionParameterRequest.ts";

export interface CreateModbusDeviceActionRequest {
    /** Название действия. */
    name: string;

    /** Описание действия. */
    description?: string | null;

    /** Id шаблона устройства, которому принадлежит действие. */
    modbusDeviceTemplateId: string; // Guid

    /** Тип действия (обычное, идентификация и т.п.). */
    modbusActionType: ModbusActionType;

    /** Логика выполнения действия в виде скрипта (C#). */
    executionLogic?: string | null;

    /** Тип возвращаемого значения (как строка). */
    returnType: string;

    /** Список параметров, участвующих в действии. */
    modbusDeviceActionParameters: CreateModbusDeviceActionParameterRequest[];

    /** Список фич, используемых скриптом. */
    scriptUsingFeatures: ScriptUsingFeatureDto[];
}
