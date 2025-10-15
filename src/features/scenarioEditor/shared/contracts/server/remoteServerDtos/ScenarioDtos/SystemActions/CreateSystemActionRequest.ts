import type { SystemActionControlMode } from "@scenario/shared/contracts/server/types/Api.Shared/SystemActionControlMode.ts";
import type { ActionType } from "@scenario/shared/contracts/server/types/Api.Shared/ActionType.ts";
import type { SystemActionScriptUsingFeatureDto } from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/SystemActionScriptUsingFeatures/SystemActionScriptUsingFeatureDto.ts";

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
