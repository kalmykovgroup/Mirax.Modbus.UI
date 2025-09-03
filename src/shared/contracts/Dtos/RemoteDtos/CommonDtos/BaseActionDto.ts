import type {ActionType} from "@shared/contracts/Types/Api.Shared/ActionType.ts";
import type {
    ScriptUsingFeatureDto
} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface BaseActionDto {
    id: Guid;
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
