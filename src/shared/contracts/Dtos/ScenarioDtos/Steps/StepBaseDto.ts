import type { StepType } from "@shared/contracts/Types/StepType.ts";
import type { AwaitSignalStepType } from "@shared/contracts/Types/AwaitSignalStepType.ts";
import type { SendSignalStepType } from "@shared/contracts/Types/SendSignalStepType.ts";

import type { ModbusDeviceAddressDto } from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceAddresses/ModbusDeviceAddressDto.ts";
import type { BranchDto } from "@shared/contracts/Dtos/ScenarioDtos/Branches/BranchDto.ts";
import type { StepRelationDto } from "@shared/contracts/Dtos/ScenarioDtos/StepRelations/StepRelationDto.ts";
import type {
    ModbusDeviceActionDto
} from "@shared/contracts/Dtos/ModbusDtos/ModbusDeviceActionParameters/ModbusDeviceActionDto.ts";
import type {SystemActionDto} from "@shared/contracts/Dtos/ScenarioDtos/SystemActions/SystemActionDto.ts";

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
