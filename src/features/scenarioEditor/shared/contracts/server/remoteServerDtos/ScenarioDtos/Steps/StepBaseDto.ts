// src/shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts
import { StepType } from "@scenario/shared/contracts/server/types/Api.Shared/StepType.ts";
import type { AwaitSignalStepType } from "@scenario/shared/contracts/server/types/Api.Shared/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@scenario/shared/contracts/server/types/Api.Shared/SendSignalStepType.ts";


import type {StepRelationDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto.ts";
import type {
    ParallelStepBranchRelationDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepBranchRelations/Parallel/ParallelStepBranchRelationDto.ts";
import type {
    ConditionStepBranchRelationDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepBranchRelations/Condition/ConditionStepBranchRelationDto.ts";
import type {SystemActionDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/SystemActions/SystemActionDto.ts";
import type {
    ModbusDeviceActionDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceActions/ModbusDeviceActionDto.ts";
import type {
    ModbusDeviceAddressDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";

// ---------------- Базовый тип ----------------

export interface StepBaseDto {
    id: Guid;
    type: StepType;

    branchId: Guid;
    name: string;
    description?: string | undefined;
    taskQueue: string;

    defaultInput?: string | undefined;
    defaultOutput?: string | undefined;

    // Координаты/размер (в пикселях canvas редактора)
    x: number;
    y: number;
    width: number;
    height: number;

    childRelations: StepRelationDto[];
    parentRelations: StepRelationDto[];
}

// ---------------- Наследники ----------------

export interface ActivityModbusStepDto extends StepBaseDto {
    sessionId: Guid;
    connectionConfigId: Guid;

    modbusDeviceActionId: Guid;
    modbusDeviceAction?: ModbusDeviceActionDto | undefined;

    modbusDeviceAddressId: Guid;
    modbusDeviceAddress?: ModbusDeviceAddressDto | undefined;
}

export interface ActivitySystemStepDto extends StepBaseDto {
    systemActionId: Guid;
    systemAction?: SystemActionDto | undefined;
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
    | ActivityModbusStepDto
    | ActivitySystemStepDto
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
        name?: string | undefined;
        description?: string | undefined;
        taskQueue?: string | undefined;
        defaultInput?: string | undefined;
        defaultOutput?: string | undefined;
        x?: number | undefined;
        y?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        childRelations?: StepRelationDto[] | undefined;
        parentRelations?: StepRelationDto[] | undefined;
    }
): StepBaseDto => ({
    id: p.id ?? genId(),
    type,
    branchId: p.branchId,
    name: p.name ?? "",
    description: p.description,
    taskQueue: p.taskQueue ?? "",
    defaultInput: p.defaultInput ?? undefined,
    defaultOutput: p.defaultOutput ?? undefined,
    x: p.x ?? 0,
    y: p.y ?? 0,
    width: p.width ?? 0,
    height: p.height ?? 0,
    childRelations: p.childRelations ?? [],
    parentRelations: p.parentRelations ?? [],
});


export const ActivityModbusStepDto = {
    create(
        p: {
            branchId: string;
            name?: string | undefined;
            taskQueue?: string | undefined;
            defaultInput?: string | undefined;
            defaultOutput?: string  | undefined;
            x?: number | undefined;
            y?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            childRelations?: StepRelationDto[] | undefined;
            parentRelations?: StepRelationDto[] | undefined;
        } & Partial<ActivityModbusStepDto>
    ): ActivityModbusStepDto {
        return {
            ...base(FlowType.ActivityModbus, p),
            sessionId: p.sessionId ?? undefined,
            connectionConfigId: p.connectionConfigId ?? undefined,
            modbusDeviceActionId: p.modbusDeviceActionId ?? undefined,
            modbusDeviceAction: p.modbusDeviceAction ?? undefined,
            modbusDeviceAddressId: p.modbusDeviceAddressId ?? undefined,
            modbusDeviceAddress: p.modbusDeviceAddress ?? undefined,
        } as ActivityModbusStepDto;
    },
} as const;

export const ActivitySystemStepDto = {
    create(
        p: {
            branchId: string;
            name?: string | undefined;
            taskQueue?: string | undefined;
            defaultInput?: string | undefined;
            defaultOutput?: string | undefined;
            x?: number | undefined;
            y?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            childRelations?: StepRelationDto[] | undefined;
            parentRelations?: StepRelationDto[] | undefined;
        } & Partial<ActivitySystemStepDto>
    ): ActivitySystemStepDto {
        return {
            ...base(FlowType.ActivitySystem, p),
            systemActionId: p.systemActionId ?? undefined,
            systemAction: p.systemAction ?? undefined,
        } as ActivitySystemStepDto;
    },
} as const;

export const DelayStepDto = {
    create(
        p: {
            branchId: string;
            name?: string | undefined;
            taskQueue?: string | undefined;
            timeSpan?: string | undefined;
            defaultInput?: string | undefined;
            defaultOutput?: string | undefined;
            x?: number  | undefined;
            y?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            childRelations?: StepRelationDto[] | undefined;
            parentRelations?: StepRelationDto[] | undefined;
        } & Partial<DelayStepDto>
    ): DelayStepDto {
        return {
            ...base(FlowType.Delay, p),
            timeSpan: p.timeSpan ?? "PT0S",
        } as DelayStepDto;
    },
} as const;

export const SignalStepDto = {
    create(
        p: {
            branchId: string;
            name?: string | undefined;
            taskQueue?: string | undefined;
            awaitSignalStepType: AwaitSignalStepType;
            sendSignalStepType: SendSignalStepType;
            signalKey?: string | undefined;
            sendSignalData?: string | undefined;
            defaultInput?: string | undefined;
            defaultOutput?: string | undefined;
            x?: number | undefined;
            y?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            childRelations?: StepRelationDto[] | undefined;
            parentRelations?: StepRelationDto[] | undefined;
        } & Partial<SignalStepDto>
    ): SignalStepDto {
        return {
            ...base(FlowType.Signal, p),
            awaitSignalStepType: p.awaitSignalStepType,
            sendSignalStepType: p.sendSignalStepType,
            signalKey: p.signalKey ?? undefined,
            sendSignalData: p.sendSignalData ?? undefined,
        } as SignalStepDto;
    },
} as const;

export const JumpStepDto = {
    create(
        p: {
            branchId: string;
            name?: string | undefined;
            taskQueue?: string | undefined;
            jumpToStepId?: string | undefined;
            defaultInput?: string | undefined;
            defaultOutput?: string | undefined;
            x?: number | undefined;
            y?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            childRelations?: StepRelationDto[] | undefined;
            parentRelations?: StepRelationDto[] | undefined;
        } & Partial<JumpStepDto>
    ): JumpStepDto {
        return {
            ...base(FlowType.Jump, p),
            jumpToStepId: p.jumpToStepId ?? undefined,
        } as JumpStepDto;
    },
} as const;

export const ParallelStepDto = {
    create(
        p: {
            branchId: string;
            name?: string | undefined;
            taskQueue?: string | undefined;
            defaultInput?: string | undefined;
            defaultOutput?: string | undefined;
            x?: number | undefined;
            y?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            childRelations?: StepRelationDto[] | undefined;
            parentRelations?: StepRelationDto[] | undefined;
            stepBranchRelations?: ParallelStepBranchRelationDto[] | undefined;
        } & Partial<ParallelStepDto>
    ): ParallelStepDto {
        return {
            ...base(FlowType.Parallel, p),
            stepBranchRelations: p.stepBranchRelations ?? [],
        };
    },
} as const;

export const ConditionStepDto = {
    create(
        p: {
            branchId: string;
            name?: string | undefined;
            taskQueue?: string | undefined;
            defaultInput?: string | undefined;
            defaultOutput?: string | undefined;
            x?: number | undefined;
            y?: number | undefined;
            width?: number | undefined;
            height?: number | undefined;
            childRelations?: StepRelationDto[] | undefined;
            parentRelations?: StepRelationDto[] | undefined;
            stepBranchRelations?: ConditionStepBranchRelationDto[] | undefined;
        } & Partial<ConditionStepDto>
    ): ConditionStepDto {
        return {
            ...base(FlowType.Condition, p),
            stepBranchRelations: p.stepBranchRelations ?? [],
        };
    },
} as const;
