import type { SystemActionControlMode } from "@shared/contracts/Types/SystemActionControlMode.ts";
import type { ActionType } from "@shared/contracts/Types/ActionType.ts";
import type { SystemActionScriptUsingFeatureDto } from "@shared/contracts/Dtos/ScenarioDtos/SystemActionScriptUsingFeatures/SystemActionScriptUsingFeatureDto.ts";

export interface CreateSystemActionRequest {
    /** Название действия */
    name: string;
    /** Описание */
    description?: string | null;
    /** Пользовательские скрипты */
    executionLogic: string;
    /** Тип возврата */
    returnType: string;
    /** Тип действия (Modbus, System) */
    actionType: ActionType;
    /** Тип управляющего поведения SystemAction */
    controlMode: SystemActionControlMode;
    /** Дождаться выполнения сценария или запустить параллельно */
    isTargetScenarioAwait: boolean;
    /** using для пользовательских скриптов */
    systemActionScriptUsingFeatures: SystemActionScriptUsingFeatureDto[];
}
