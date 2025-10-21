import type { AwaitSignalStepType } from "@scenario/shared/contracts/server/types/Api.Shared/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@scenario/shared/contracts/server/types/Api.Shared/SendSignalStepType.ts";
import type { StepType } from "@scenario/shared/contracts/server/types/Api.Shared/StepType.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

/** База Update (C# UpdateStepBase) — дискриминатор: "kind" */
interface UpdateStepBase {
    /** Guid — обязательный */
    id: Guid;

    name?: string | null;
    taskQueue?: string | null;
    /** перенос шага в другую ветку (если разрешён) */
    branchId?: Guid | null; // Guid

    /** координаты/размеры: не nullable в C#, поэтому передаём числа
     *  (если хочешь «не менять» — бэкенд должен отличать отсутствие поля от 0) */
    x: number;
    y: number;
    width: number;
    height: number;

    /** для кандидатов в Condition */
    conditionParentStepId?: Guid | null; // Guid
    conditionOrder?: number | null;
    conditionExpression?: string | null;
}

/** База Update для Activity (C# UpdateActivityStepBase) */
interface UpdateActivityStepBase extends UpdateStepBase {
    defaultInput?: string | null;
    defaultOutput?: string | null;
}

/** Modbus Activity (C# UpdateActivityModbusStepRequest) */
export interface UpdateActivityModbusStepRequest extends UpdateActivityStepBase {
    // дискриминатор для полиморфной сериализации на бэке
    kind: StepType.ActivityModbus;
    modbusDeviceActionId?: string | null;   // Guid?
    modbusDeviceAddressId?: string | null;  // Guid?
}

/** System Activity (C# UpdateActivitySystemStepRequest) */
export interface UpdateActivitySystemStepRequest extends UpdateActivityStepBase {
    kind: StepType.ActivitySystem;
    systemActionId?: string | null; // Guid?
}

/** Delay (C# UpdateDelayStepRequest) */
export interface UpdateDelayStepRequest extends UpdateStepBase {
    kind: StepType.Delay;
    timeSpan?: string | null; // ISO 8601 duration
}

/** Signal (C# UpdateSignalStepRequest) */
export interface UpdateSignalStepRequest extends UpdateStepBase {
    kind: StepType.Signal;
    awaitSignalStepType?: AwaitSignalStepType | null;
    sendSignalStepType?: SendSignalStepType | null;
    signalKey?: string | null;
    sendSignalData?: string | null;
}

/** Jump (C# UpdateJumpStepRequest) */
export interface UpdateJumpStepRequest extends UpdateStepBase {
    kind: StepType.Jump;
    jumpToStepId?: Guid | null; // Guid?
}

/** Parallel (C# UpdateParallelStepRequest) */
export interface UpdateParallelStepRequest extends UpdateStepBase {
    kind: StepType.Parallel;
}

/** Condition (C# UpdateConditionStepRequest) */
export interface UpdateConditionStepRequest extends UpdateStepBase {
    kind: StepType.Condition;
}

/** Объединяющий дискриминированный тип */
export type UpdateStepRequest =
    | UpdateActivityModbusStepRequest
    | UpdateActivitySystemStepRequest
    | UpdateDelayStepRequest
    | UpdateSignalStepRequest
    | UpdateJumpStepRequest
    | UpdateParallelStepRequest
    | UpdateConditionStepRequest;
