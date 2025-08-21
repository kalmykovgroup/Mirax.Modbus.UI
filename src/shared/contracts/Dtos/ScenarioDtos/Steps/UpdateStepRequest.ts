import type { AwaitSignalStepType } from "@shared/contracts/Types/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@shared/contracts/Types/SendSignalStepType.ts";
import type { StepType } from "@shared/contracts/Types/StepType.ts";

/** Базовый тип для всех update-запросов шагов */
interface UpdateStepBase {
    id: string; // Guid — обязательный
    name?: string | null;
    taskQueue?: string | null;
    branchId?: string | null; // Guid
    conditionParentStepId?: string | null; // Guid
    conditionOrder?: number | null;
    conditionExpression?: string | null;
}

/** Для Activity шагов */
interface UpdateActivityStepBase extends UpdateStepBase {
    keyInput?: string | null; // Guid
    keyOutput?: string | null; // Guid
    defaultInput?: string | null;
}

/** Modbus Activity */
export interface UpdateModbusActivityStepRequest extends UpdateActivityStepBase {
    kind: StepType.ModbusActivity;
    modbusDeviceActionId?: string | null; // Guid
    modbusDeviceAddressId?: string | null; // Guid
}

/** System Activity */
export interface UpdateSystemActivityStepRequest extends UpdateActivityStepBase {
    kind: StepType.SystemActivity;
    systemActionId?: string | null; // Guid
}

/** DelayStepNode */
export interface UpdateDelayStepRequest extends UpdateStepBase {
    kind: StepType.Delay;
    timeSpan?: string | null;
}

/** SignalNode */
export interface UpdateSignalStepRequest extends UpdateStepBase {
    kind: StepType.Signal;
    awaitSignalStepType?: AwaitSignalStepType | null;
    sendSignalStepType?: SendSignalStepType | null;
    signalKey?: string | null;
    sendSignalData?: string | null;
}

/** Jump */
export interface UpdateJumpStepRequest extends UpdateStepBase {
    kind: StepType.Jump;
    jumpToStepId?: string | null; // Guid
}

/** Parallel */
export interface UpdateParallelStepRequest extends UpdateStepBase {
    kind: StepType.Parallel;
}

/** Condition */
export interface UpdateConditionStepRequest extends UpdateStepBase {
    kind: StepType.Condition;
}

/** Объединяющий дискриминированный тип */
export type UpdateStepRequest =
    | UpdateModbusActivityStepRequest
    | UpdateSystemActivityStepRequest
    | UpdateDelayStepRequest
    | UpdateSignalStepRequest
    | UpdateJumpStepRequest
    | UpdateParallelStepRequest
    | UpdateConditionStepRequest;
