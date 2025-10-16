// src/features/scenario/commands/helpers/entityMappers.ts

import type { Guid } from '@app/lib/types/Guid';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import type { AnyStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';
import type {AnyStepEntity} from "@scenario/core/features/historySystem/entities/stepEntities.ts";
import type {BranchEntity} from "@scenario/core/features/historySystem/handlers/branchHistoryHandler.ts";
import type {RelationEntity} from "@scenario/core/features/historySystem/handlers/relationHistoryHandler.ts";
import type {NormalizedBranch, NormalizedStep} from "@scenario/store/scenarioSlice.ts";



/**
 * Мапинг StepType → EntityType
 */
const STEP_TYPE_TO_ENTITY_TYPE: Record<StepType, string> = {
    [StepType.ModbusActivity]: 'ModbusActivityStep',
    [StepType.SystemActivity]: 'SystemActivityStep',
    [StepType.Delay]: 'DelayStep',
    [StepType.Signal]: 'SignalStep',
    [StepType.Jump]: 'JumpStep',
    [StepType.Parallel]: 'ParallelStep',
    [StepType.Condition]: 'ConditionStep',
};

/**
 * Получить entityType для шага
 */
export function getStepEntityType(stepType: StepType): string {
    return STEP_TYPE_TO_ENTITY_TYPE[stepType] ?? 'DelayStep';
}

/**
 * Денормализовать NormalizedStep → AnyStepDto для истории
 */
export function denormalizeStepForHistory(
    normalizedStep: NormalizedStep,
    relations: Record<Guid, StepRelationDto | undefined>
): AnyStepDto {
    const childRelations = normalizedStep.childRelationIds
        .map((id) => relations[id])
        .filter(Boolean) as StepRelationDto[];

    const parentRelations = normalizedStep.parentRelationIds
        .map((id) => relations[id])
        .filter(Boolean) as StepRelationDto[];

    return {
        ...normalizedStep,
        childRelations,
        parentRelations,
    } as AnyStepDto;
}

/**
 * Преобразовать NormalizedStep → StepEntity для истории
 */
export function normalizedStepToEntity(
    normalizedStep: NormalizedStep,
    relations: Record<Guid, StepRelationDto | undefined>
): AnyStepEntity {
    const denormalized = denormalizeStepForHistory(normalizedStep, relations);
    const entityType = getStepEntityType(normalizedStep.type as StepType);

    return {
        ...denormalized,
        entityType,
    } as AnyStepEntity;
}

/**
 * Преобразовать NormalizedBranch → BranchEntity для истории
 */
export function normalizedBranchToEntity(
    normalizedBranch: NormalizedBranch,
    steps: readonly AnyStepDto[]
): BranchEntity {
    return {
        ...normalizedBranch,
        entityType: 'Branch',
        steps,
    } as BranchEntity;
}

/**
 * Преобразовать StepRelationDto → RelationEntity для истории
 */
export function relationToEntity(relation: StepRelationDto): RelationEntity {
    return {
        ...relation,
        entityType: 'StepRelation',
    };
}