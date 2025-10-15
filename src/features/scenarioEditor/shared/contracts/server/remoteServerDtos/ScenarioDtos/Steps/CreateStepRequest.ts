import type { StepType } from "@scenario/shared/contracts/server/types/Api.Shared/StepType.ts";
import type { AwaitSignalStepType } from "@scenario/shared/contracts/server/types/Api.Shared/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@scenario/shared/contracts/server/types/Api.Shared/SendSignalStepType.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

/** Базовый тип Create (C# CreateStepBase) */
interface CreateStepBase {
    /** Guid? — опционально для апдейта через Create */
    id?: Guid | null;

    /** дискриминатор полиморфизма, JSON property: "type" */
    type: StepType;

    branchId: Guid; // Guid
    name: string;
    taskQueue: string;

    /** координаты/размеры диаграммы — соответствуют C# int */
    x: number;
    y: number;
    width: number;
    height: number;

    /** кандидаты в Condition (опционально) */
    conditionParentStepId?: Guid | null; // Guid
    conditionOrder?: number | null;
    conditionExpression?: string | null;
}

/** База для Activity (C# CreateActivityStepBase) */
interface CreateActivityStepBase extends CreateStepBase {
    defaultInput?: string | null;
    defaultOutput?: string | null;
}

/** Modbus Activity (C# CreateModbusActivityStepRequest) */
export interface CreateModbusActivityStepRequest extends CreateActivityStepBase {
    // ВАЖНО: подгони значение под твой enum (в C#: ActivityModbus)
    type: StepType.ModbusActivity;
    modbusDeviceActionId?: Guid | null;   // Guid?
    modbusDeviceAddressId?: Guid | null;  // Guid?
}

/** System Activity (C# CreateSystemActivityStepRequest) */
export interface CreateSystemActivityStepRequest extends CreateActivityStepBase {
    // В C#: ActivitySystem
    type: StepType.SystemActivity;
    systemActionId?: Guid | null; // Guid?
}

/** Delay (C# CreateDelayStepRequest) */
export interface CreateDelayStepRequest extends CreateStepBase {
    type: StepType.Delay;
    /** ISO 8601 duration: "PT5S" и т.п. */
    timeSpan?: string | null;
}

/** Signal (C# CreateSignalStepRequest) */
export interface CreateSignalStepRequest extends CreateStepBase {
    type: StepType.Signal;
    awaitSignalStepType?: AwaitSignalStepType | null;
    sendSignalStepType?: SendSignalStepType | null;
    signalKey?: string | null;
    sendSignalData?: string | null;
}

/** Jump (C# CreateJumpStepRequest) */
export interface CreateJumpStepRequest extends CreateStepBase {
    type: StepType.Jump;
    jumpToStepId?: string | null; // Guid?
}

/** Parallel (C# CreateParallelStepRequest) */
export interface CreateParallelStepRequest extends CreateStepBase {
    type: StepType.Parallel;
}

/** Condition (C# CreateConditionStepRequest) */
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
