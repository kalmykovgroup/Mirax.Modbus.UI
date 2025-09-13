// src/shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts
import { StepType } from "@shared/contracts/Types/Api.Shared/StepType.ts";
import type { AwaitSignalStepType } from "@shared/contracts/Types/Api.Shared/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@shared/contracts/Types/Api.Shared/SendSignalStepType.ts";


import type {StepRelationDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/StepRelations/StepRelationDto.ts";
import type {
    ParallelStepBranchRelationDto
} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/StepBranchRelations/Parallel/ParallelStepBranchRelationDto.ts";
import type {
    ConditionStepBranchRelationDto
} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/StepBranchRelations/Condition/ConditionStepBranchRelationDto.ts";
import type {SystemActionDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/SystemActions/SystemActionDto.ts";
import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceActions/ModbusDeviceActionDto.ts";
import type {
    ModbusDeviceAddressDto
} from "@shared/contracts/Dtos/RemoteDtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";

// ---------------- Базовый тип ----------------

export interface StepBaseDto {
    id: Guid;
    type: StepType;

    branchId: Guid;
    name: string;
    taskQueue: string;

    defaultInput?: string | null;
    defaultOutput?: string | null;

    // Координаты/размер (в пикселях canvas редактора)
    x: number;       // C# int → TS number
    y: number;       // C# int → TS number
    width: number;   // C# int → TS number
    height: number;  // C# int → TS number

    childRelations: StepRelationDto[];
    parentRelations: StepRelationDto[];
}

// ---------------- Наследники ----------------

export interface ModbusActivityStepDto extends StepBaseDto {
    sessionId: Guid;
    connectionConfigId: Guid;

    modbusDeviceActionId: Guid;
    modbusDeviceAction?: ModbusDeviceActionDto | null;

    modbusDeviceAddressId: Guid;
    modbusDeviceAddress?: ModbusDeviceAddressDto | null;
}

export interface SystemActivityStepDto extends StepBaseDto {
    systemActionId: Guid;
    systemAction?: SystemActionDto | null;
}

export interface DelayStepDto extends StepBaseDto {
    timeSpan: string; // ISO 8601 duration
}

export interface SignalStepDto extends StepBaseDto {
    awaitSignalStepType: AwaitSignalStepType;
    sendSignalStepType: SendSignalStepType;
    signalKey: string;
    sendSignalData: string;
}

export interface JumpStepDto extends StepBaseDto {
    jumpToStepId: Guid;
}

export interface ParallelStepDto extends StepBaseDto {
    stepBranchRelations: ParallelStepBranchRelationDto[];
}

export interface ConditionStepDto extends StepBaseDto {
    stepBranchRelations: ConditionStepBranchRelationDto[];
}

export type AnyStepDto =
    | ModbusActivityStepDto
    | SystemActivityStepDto
    | DelayStepDto
    | SignalStepDto
    | JumpStepDto
    | ParallelStepDto
    | ConditionStepDto;

// ---------------- Фабрики ----------------

const genId = () => crypto.randomUUID();

// База для всех create-фабрик
const base = (
    type: StepType,
    p: {
        id?: string;
        branchId: string;
        name?: string;
        taskQueue?: string;
        defaultInput?: string | null;
        defaultOutput?: string | null;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        childRelations?: StepRelationDto[];
        parentRelations?: StepRelationDto[];
    }
): StepBaseDto => ({
    id: p.id ?? genId(),
    type,
    branchId: p.branchId,
    name: p.name ?? "",
    taskQueue: p.taskQueue ?? "",
    defaultInput: p.defaultInput ?? null,
    defaultOutput: p.defaultOutput ?? null,
    x: p.x ?? 0,
    y: p.y ?? 0,
    width: p.width ?? 0,
    height: p.height ?? 0,
    childRelations: p.childRelations ?? [],
    parentRelations: p.parentRelations ?? [],
});

// Соответствие FlowType → StepType (как в C#)
const STEP_OF: Record<Exclude<FlowType, FlowType.branchNode>, StepType> = {
    [FlowType.jumpStepNode]: StepType.Jump,
    [FlowType.delayStepNode]: StepType.Delay,
    [FlowType.parallelStepNode]: StepType.Parallel,
    [FlowType.conditionStepNode]: StepType.Condition,
    [FlowType.activitySystemNode]: StepType.SystemActivity,
    [FlowType.activityModbusNode]: StepType.ModbusActivity,
    [FlowType.signalStepNode]: StepType.Signal,
};

export const ModbusActivityStepDto = {
    create(
        p: {
            branchId: string;
            name?: string;
            taskQueue?: string;
            defaultInput?: string | null;
            defaultOutput?: string | null;
            x?: number; y?: number; width?: number; height?: number;
            childRelations?: StepRelationDto[];
            parentRelations?: StepRelationDto[];
        } & Partial<ModbusActivityStepDto>
    ): ModbusActivityStepDto {
        return {
            ...base(STEP_OF[FlowType.activityModbusNode], p),
            sessionId: p.sessionId ?? "",
            connectionConfigId: p.connectionConfigId ?? "",
            modbusDeviceActionId: p.modbusDeviceActionId ?? "",
            modbusDeviceAction: p.modbusDeviceAction ?? null,
            modbusDeviceAddressId: p.modbusDeviceAddressId ?? "",
            modbusDeviceAddress: p.modbusDeviceAddress ?? null,
        };
    },
} as const;

export const SystemActivityStepDto = {
    create(
        p: {
            branchId: string;
            name?: string;
            taskQueue?: string;
            defaultInput?: string | null;
            defaultOutput?: string | null;
            x?: number; y?: number; width?: number; height?: number;
            childRelations?: StepRelationDto[];
            parentRelations?: StepRelationDto[];
        } & Partial<SystemActivityStepDto>
    ): SystemActivityStepDto {
        return {
            ...base(STEP_OF[FlowType.activitySystemNode], p),
            systemActionId: p.systemActionId ?? "",
            systemAction: p.systemAction ?? null,
        };
    },
} as const;

export const DelayStepDto = {
    create(
        p: {
            branchId: string;
            name?: string;
            taskQueue?: string;
            timeSpan?: string;
            defaultInput?: string | null;
            defaultOutput?: string | null;
            x?: number; y?: number; width?: number; height?: number;
            childRelations?: StepRelationDto[];
            parentRelations?: StepRelationDto[];
        } & Partial<DelayStepDto>
    ): DelayStepDto {
        return {
            ...base(STEP_OF[FlowType.delayStepNode], p),
            timeSpan: p.timeSpan ?? "PT0S",
        };
    },
} as const;

export const SignalStepDto = {
    create(
        p: {
            branchId: string;
            name?: string;
            taskQueue?: string;
            awaitSignalStepType: AwaitSignalStepType;
            sendSignalStepType: SendSignalStepType;
            signalKey?: string;
            sendSignalData?: string;
            defaultInput?: string | null;
            defaultOutput?: string | null;
            x?: number; y?: number; width?: number; height?: number;
            childRelations?: StepRelationDto[];
            parentRelations?: StepRelationDto[];
        } & Partial<SignalStepDto>
    ): SignalStepDto {
        return {
            ...base(STEP_OF[FlowType.signalStepNode], p),
            awaitSignalStepType: p.awaitSignalStepType,
            sendSignalStepType: p.sendSignalStepType,
            signalKey: p.signalKey ?? "",
            sendSignalData: p.sendSignalData ?? "",
        };
    },
} as const;

export const JumpStepDto = {
    create(
        p: {
            branchId: string;
            name?: string;
            taskQueue?: string;
            jumpToStepId?: string;
            defaultInput?: string | null;
            defaultOutput?: string | null;
            x?: number; y?: number; width?: number; height?: number;
            childRelations?: StepRelationDto[];
            parentRelations?: StepRelationDto[];
        } & Partial<JumpStepDto>
    ): JumpStepDto {
        return {
            ...base(STEP_OF[FlowType.jumpStepNode], p),
            jumpToStepId: p.jumpToStepId ?? "",
        };
    },
} as const;

export const ParallelStepDto = {
    create(
        p: {
            branchId: string;
            name?: string;
            taskQueue?: string;
            defaultInput?: string | null;
            defaultOutput?: string | null;
            x?: number; y?: number; width?: number; height?: number;
            childRelations?: StepRelationDto[];
            parentRelations?: StepRelationDto[];
            stepBranchRelations?: ParallelStepBranchRelationDto[];
        } & Partial<ParallelStepDto>
    ): ParallelStepDto {
        return {
            ...base(STEP_OF[FlowType.parallelStepNode], p),
            stepBranchRelations: p.stepBranchRelations ?? [],
        };
    },
} as const;

export const ConditionStepDto = {
    create(
        p: {
            branchId: string;
            name?: string;
            taskQueue?: string;
            defaultInput?: string | null;
            defaultOutput?: string | null;
            x?: number; y?: number; width?: number; height?: number;
            childRelations?: StepRelationDto[];
            parentRelations?: StepRelationDto[];
            stepBranchRelations?: ConditionStepBranchRelationDto[];
        } & Partial<ConditionStepDto>
    ): ConditionStepDto {
        return {
            ...base(STEP_OF[FlowType.conditionStepNode], p),
            stepBranchRelations: p.stepBranchRelations ?? [],
        };
    },
} as const;
