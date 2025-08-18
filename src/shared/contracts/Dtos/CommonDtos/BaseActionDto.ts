import type {ActionType} from "@shared/contracts/Types/ActionType.ts";
import type {
    ScriptUsingFeatureDto
} from "@shared/contracts/Dtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";

export interface BaseActionDto {
    id: string;
    /** Название действия */
    name: string;
    /** Описание */
    description?: string | null;
    /** Логика выполнения действия в виде скрипта (C#) */
    executionLogic?: string | null;
    /** Тип возвращаемого значения действия */
    returnType: string;
    /** Тип действия (Modbus, System) */
    actionType: ActionType;
    /** using-директивы для пользовательских скриптов */
    scriptUsingFeatures: ScriptUsingFeatureDto[];
}
