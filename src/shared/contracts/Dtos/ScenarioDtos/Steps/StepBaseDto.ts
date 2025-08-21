import { StepType } from "@shared/contracts/Types/StepType.ts";
import type { AwaitSignalStepType } from "@shared/contracts/Types/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@shared/contracts/Types/SendSignalStepType.ts";

import type { ModbusDeviceAddressDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type { BranchDto } from "@shared/contracts/Dtos/ScenarioDtos/Branches/BranchDto.ts";
import type { StepRelationDto } from "@shared/contracts/Dtos/ScenarioDtos/StepRelations/StepRelationDto.ts";
import type {SystemActionDto} from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/SystemActionDto.ts";
import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActions/ModbusDeviceActionDto.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";

export interface StepBaseDto {
    id: string;
    type: StepType;
    branchId: string;
    name: string;
    taskQueue: string;
    keyInput?: string | null;
    keyOutput?: string | null;
    defaultInput?: string | null;
    childRelations: StepRelationDto[];
    parentRelations: StepRelationDto[];

}

export interface ModbusActivityStepDto extends StepBaseDto {
    sessionId: string;
    connectionConfigId: string;
    modbusDeviceActionId: string;
    modbusDeviceAction?: ModbusDeviceActionDto | null;
    modbusDeviceAddressId: string;
    modbusDeviceAddress?: ModbusDeviceAddressDto | null;
}

export interface SystemActivityStepDto extends StepBaseDto {
    systemActionId: string;
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
    jumpToStepId: string;
}

export interface ParallelStepDto extends StepBaseDto {
    branches: BranchDto[];
}

export interface ConditionStepDto extends StepBaseDto {
    branches: BranchDto[];
}


// ====== Фабрики рядом (тип+значение с одним именем) ======

// базовая заготовка
const genId = () => crypto.randomUUID();
const base = (type: StepType, p: { branchId: string; name?: string; taskQueue?: string }): StepBaseDto => ({
    id: genId(),
    type,
    branchId: p.branchId,
    name: p.name ?? '',
    taskQueue: p.taskQueue ?? '',
    keyInput: null,
    keyOutput: null,
    defaultInput: null,
    childRelations: [],
    parentRelations: [],
});

// соответствие FlowType → StepType (подставь свои enum-значения!)
const STEP_OF: Record<Exclude<FlowType, FlowType.branchNode>, StepType> = {
    [FlowType.jumpStepNode]: StepType.Jump,                 // ← проверь реальные имена
    [FlowType.delayStepNode]: StepType.Delay,
    [FlowType.parallelStepNode]: StepType.Parallel,
    [FlowType.conditionStepNode]: StepType.Condition,
    [FlowType.activitySystemNode]: StepType.SystemActivity,
    [FlowType.activityModbusNode]: StepType.ModbusActivity,
    [FlowType.signalNode]: StepType.Signal,
};

// ---- «статические» фабрики на каждом DTO ----
export const ModbusActivityStepDto = {
    create(p: { branchId: string; name?: string; taskQueue?: string } & Partial<ModbusActivityStepDto>): ModbusActivityStepDto {
        return {
            ...base(STEP_OF[FlowType.activityModbusNode], p),
            sessionId: p.sessionId ?? '',
            connectionConfigId: p.connectionConfigId ?? '',
            modbusDeviceActionId: p.modbusDeviceActionId ?? '',
            modbusDeviceAction: p.modbusDeviceAction ?? null,
            modbusDeviceAddressId: p.modbusDeviceAddressId ?? '',
            modbusDeviceAddress: p.modbusDeviceAddress ?? null,
        };
    },
} as const;

export const SystemActivityStepDto = {
    create(p: { branchId: string; name?: string; taskQueue?: string } & Partial<SystemActivityStepDto>): SystemActivityStepDto {
        return {
            ...base(STEP_OF[FlowType.activitySystemNode], p),
            systemActionId: p.systemActionId ?? '',
            systemAction: p.systemAction ?? null,
        };
    },
} as const;

export const DelayStepDto = {
    create(p: { branchId: string; name?: string; taskQueue?: string; timeSpan?: string } & Partial<DelayStepDto>): DelayStepDto {
        return {
            ...base(STEP_OF[FlowType.delayStepNode], p),
            timeSpan: p.timeSpan ?? 'PT0S',
        };
    },
} as const;

export const SignalStepDto = {
    create(p: {
        branchId: string; name?: string; taskQueue?: string;
        awaitSignalStepType: AwaitSignalStepType;
        sendSignalStepType: SendSignalStepType;
        signalKey?: string;
        sendSignalData?: string;
    } & Partial<SignalStepDto>): SignalStepDto {
        return {
            ...base(STEP_OF[FlowType.signalNode], p),
            awaitSignalStepType: p.awaitSignalStepType,
            sendSignalStepType: p.sendSignalStepType,
            signalKey: p.signalKey ?? '',
            sendSignalData: p.sendSignalData ?? '',
        };
    },
} as const;

export const JumpStepDto = {
    create(p: { branchId: string; name?: string; taskQueue?: string; jumpToStepId?: string } & Partial<JumpStepDto>): JumpStepDto {
        return {
            ...base(STEP_OF[FlowType.jumpStepNode], p),
            jumpToStepId: p.jumpToStepId ?? '',
        };
    },
} as const;

export const ParallelStepDto = {
    create(p: { branchId: string; name?: string; taskQueue?: string } & Partial<ParallelStepDto>): ParallelStepDto {
        return {
            ...base(STEP_OF[FlowType.parallelStepNode], p),
            branches: p.branches ?? [],
        };
    },
} as const;

export const ConditionStepDto = {
    create(p: { branchId: string; name?: string; taskQueue?: string } & Partial<ConditionStepDto>): ConditionStepDto {
        return {
            ...base(STEP_OF[FlowType.conditionStepNode], p),
            branches: p.branches ?? [],
        };
    },
} as const;
