import type { AwaitSignalStepType } from "@scenario/shared/contracts/server/types/Api.Shared/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@scenario/shared/contracts/server/types/Api.Shared/SendSignalStepType.ts";
import type { StepType } from "@scenario/shared/contracts/server/types/Api.Shared/StepType.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

/** База Update (C# UpdateStepBase) — дискриминатор: "type" */
interface UpdateStepBase {
    /** Guid — обязательный */
    id: Guid;

    name: string | null;
    description?: string | null;
    taskQueue: string;
    /** перенос шага в другую ветку (если разрешён) */
    branchId: Guid;

    /** координаты/размеры: не nullable в C#, поэтому передаём числа
     *  (если хочешь «не менять» — бэкенд должен отличать отсутствие поля от 0) */
    x: number;
    y: number;
    width: number;
    height: number;

    /** для кандидатов в Condition
    conditionParentStepId?: Guid | null; // Guid
    conditionOrder?: number | null;
    conditionExpression?: string | null;*/
}

/** База Update для Activity (C# UpdateActivityStepBase) */
interface UpdateActivityStepBase extends UpdateStepBase {
    defaultInput?: string | null;
    defaultOutput?: string | null;
}

/** Modbus Activity (C# UpdateActivityModbusStepRequest) */
export interface UpdateActivityModbusStepRequest extends UpdateActivityStepBase {
    // дискриминатор для полиморфной сериализации на бэке
    type: StepType.ActivityModbus;
    modbusDeviceActionId?: string | null;   // Guid?
    modbusDeviceAddressId?: string | null;  // Guid?
}

/** System Activity (C# UpdateActivitySystemStepRequest) */
export interface UpdateActivitySystemStepRequest extends UpdateActivityStepBase {
    type: StepType.ActivitySystem;
    systemActionId?: string | null; // Guid?
}

/** Delay (C# UpdateDelayStepRequest) */
export interface UpdateDelayStepRequest extends UpdateStepBase {
    type: StepType.Delay;
    timeSpan?: string | null; // ISO 8601 duration
}

/** Signal (C# UpdateSignalStepRequest) */
export interface UpdateSignalStepRequest extends UpdateStepBase {
    type: StepType.Signal;
    awaitSignalStepType?: AwaitSignalStepType | null;
    sendSignalStepType?: SendSignalStepType | null;
    signalKey?: string | null;
    sendSignalData?: string | null;
}

/** Jump (C# UpdateJumpStepRequest) */
export interface UpdateJumpStepRequest extends UpdateStepBase {
    type: StepType.Jump;
    jumpToStepId: Guid;
    sourceHandle: string;
    targetHandle: string;
}

/** Parallel (C# UpdateParallelStepRequest) */
export interface UpdateParallelStepRequest extends UpdateStepBase {
    type: StepType.Parallel;
}

/** Condition (C# UpdateConditionStepRequest) */
export interface UpdateConditionStepRequest extends UpdateStepBase {
    type: StepType.Condition;
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
