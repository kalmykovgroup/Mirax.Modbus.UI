import type { StepType } from "@shared/contracts/Types/StepType.ts";
import type { AwaitSignalStepType } from "@shared/contracts/Types/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@shared/contracts/Types/SendSignalStepType.ts";

/** Базовый тип */
interface CreateStepBase {
    type: StepType;
    branchId: string; // Guid
    name: string;
    taskQueue: string;
    conditionParentStepId?: string | null; // Guid
    conditionOrder?: number | null;
    conditionExpression?: string | null;
}

/** Для Activity шагов */
interface CreateActivityStepBase extends CreateStepBase {
    keyInput?: string | null; // Guid
    keyOutput?: string | null; // Guid
    defaultInput?: string | null;
}

/** Modbus Activity */
export interface CreateModbusActivityStepRequest extends CreateActivityStepBase {
    type: StepType.ActivityModbus;
    modbusDeviceActionId?: string | null; // Guid
    modbusDeviceAddressId?: string | null; // Guid
}

/** System Activity */
export interface CreateSystemActivityStepRequest extends CreateActivityStepBase {
    type: StepType.ActivitySystem;
    systemActionId?: string | null; // Guid
}

/** DelayStepNode */
export interface CreateDelayStepRequest extends CreateStepBase {
    type: StepType.Delay;
    timeSpan?: string | null;
}

/** SignalNode */
export interface CreateSignalStepRequest extends CreateStepBase {
    type: StepType.Signal;
    awaitSignalStepType?: AwaitSignalStepType | null;
    sendSignalStepType?: SendSignalStepType | null;
    signalKey?: string | null;
    sendSignalData?: string | null;
}

/** Jump */
export interface CreateJumpStepRequest extends CreateStepBase {
    type: StepType.Jump;
    jumpToStepId?: string | null; // Guid
}

/** Parallel */
export interface CreateParallelStepRequest extends CreateStepBase {
    type: StepType.Parallel;
}

/** Condition */
export interface CreateConditionStepRequest extends CreateStepBase {
    type: StepType.Condition;
}

/** Объединяющий тип */
export type CreateStepRequest =
    | CreateModbusActivityStepRequest
    | CreateSystemActivityStepRequest
    | CreateDelayStepRequest
    | CreateSignalStepRequest
    | CreateJumpStepRequest
    | CreateParallelStepRequest
    | CreateConditionStepRequest;
