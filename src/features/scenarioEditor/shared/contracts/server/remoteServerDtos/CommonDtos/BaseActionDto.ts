import type {ActionType} from "@scenario/shared/contracts/server/types/Api.Shared/ActionType.ts";
import type {
    ScriptUsingFeatureDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScriptUsingFeatures/ScriptUsingFeatureDto.ts";
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
