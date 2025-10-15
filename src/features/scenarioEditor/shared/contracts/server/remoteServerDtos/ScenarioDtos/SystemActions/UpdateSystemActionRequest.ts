import type { ActionType } from "@scenario/shared/contracts/server/types/Api.Shared/ActionType.ts";
import type { SystemActionControlMode } from "@scenario/shared/contracts/server/types/Api.Shared/SystemActionControlMode.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

export interface UpdateSystemActionRequest {
    id: Guid;
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
}
