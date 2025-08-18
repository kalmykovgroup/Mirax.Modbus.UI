import type {ModbusActionType} from "@shared/contracts/Types/ModbusActionType.ts";

export interface UpdateModbusDeviceActionRequest {
    id: string; // Guid

    /** Название действия. */
    name: string;

    /** Описание действия. */
    description?: string | null;

    /** Id шаблона устройства, которому принадлежит действие. */
    modbusDeviceTemplateId: string; // Guid

    /** Ссылка на код действия (если есть). */
    modbusDeviceActionCodeId?: string | null; // Guid?

    /** Логика выполнения действия в виде скрипта (C#). */
    executionLogic?: string | null;

    /** Тип возвращаемого значения (как строка). */
    returnType: string;

    /** Тип действия (обычное, идентификация и т.п.). */
    modbusActionType: ModbusActionType;
}
