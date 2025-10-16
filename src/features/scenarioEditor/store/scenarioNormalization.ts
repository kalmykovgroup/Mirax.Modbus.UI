// src/features/scenario/scenarioNormalization.ts

import type { ScenarioDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Scenarios/ScenarioDto.ts';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto.ts';
import type { AnyStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto.ts';
import type { Guid } from '@app/lib/types/Guid.ts';
import type { NormalizedBranch, NormalizedStep } from './scenarioSlice';

// ============================================================================
// NORMALIZATION
// ============================================================================

export interface NormalizedScenarioData {
    readonly branches: readonly NormalizedBranch[];
    readonly steps: readonly NormalizedStep[];
    readonly relations: readonly StepRelationDto[];
}

/**
 * Нормализация: разбирает вложенную структуру ScenarioDto на плоские массивы
 */
export function normalizeScenario(scenario: ScenarioDto): NormalizedScenarioData {
    const branches: NormalizedBranch[] = [];
    const steps: NormalizedStep[] = [];
    const relations: StepRelationDto[] = [];

    // Обрабатываем главную ветку и все вложенные рекурсивно
    normalizeBranch(scenario.branch, scenario.id, null, branches, steps, relations);

    return { branches, steps, relations };
}

/**
 * Рекурсивная нормализация ветки
 */
function normalizeBranch(
    branch: BranchDto,
    scenarioId: Guid,
    parentStepId: Guid | null,
    branches: NormalizedBranch[],
    steps: NormalizedStep[],
    relations: StepRelationDto[]
): void {
    // Добавляем нормализованную ветку
    const normalizedBranch: NormalizedBranch = {
        id: branch.id,
        scenarioId,
        name: branch.name,
        description: branch.description,
        waitForCompletion: branch.waitForCompletion,
        parallelStepId: branch.parallelStepId ?? null,
        conditionStepId: branch.conditionStepId ?? null,
        conditionExpression: branch.conditionExpression ?? null,
        conditionOrder: branch.conditionOrder,
        stepIds: branch.steps.map((s) => s.id),
        parentStepId,
        x: branch.x,
        y: branch.y,
        width: branch.width,
        height: branch.height,
    };

    branches.push(normalizedBranch);

    // Обрабатываем шаги ветки
    for (const step of branch.steps) {
        const normalizedStep: NormalizedStep = {
            ...step,
            branchId: branch.id,
            childRelationIds: step.childRelations.map((r) => r.id),
            parentRelationIds: step.parentRelations.map((r) => r.id),
        };

        steps.push(normalizedStep);

        // Собираем relations
        for (const relation of step.childRelations) {
            if (!relations.find((r) => r.id === relation.id)) {
                relations.push(relation);
            }
        }

        for (const relation of step.parentRelations) {
            if (!relations.find((r) => r.id === relation.id)) {
                relations.push(relation);
            }
        }

        // Обрабатываем вложенные ветки для Parallel/Condition шагов
        if ('stepBranchRelations' in step) {
            const branchRelations = (step as any).stepBranchRelations;
            if (Array.isArray(branchRelations)) {
                for (const branchRel of branchRelations) {
                    // Здесь нужно получить полную ветку из scenarioDto
                    // Обычно они уже есть в branch.steps, но для параллельных/условных
                    // нужно искать по branchId в исходном ScenarioDto
                    // Пока пропускаем, т.к. структура не полная
                    console.warn(
                        '[normalizeScenario] Nested branches in Parallel/Condition steps need manual handling'
                    );
                }
            }
        }
    }
}

// ============================================================================
// DENORMALIZATION
// ============================================================================

/**
 * Денормализация: собирает вложенную структуру ScenarioDto из плоских массивов
 */
export function denormalizeScenario(
    scenarioId: Guid,
    scenarios: Record<Guid, any>,
    branches: Record<Guid, NormalizedBranch>,
    steps: Record<Guid, NormalizedStep>,
    relations: Record<Guid, StepRelationDto>
): ScenarioDto | null {
    const scenarioMeta = scenarios[scenarioId];
    if (!scenarioMeta) return null;

    const mainBranch = branches[scenarioMeta.mainBranchId];
    if (!mainBranch) return null;

    const denormalizedBranch = denormalizeBranch(mainBranch, branches, steps, relations);

    return {
        id: scenarioMeta.id,
        name: scenarioMeta.name,
        description: scenarioMeta.description ?? null,
        status: scenarioMeta.status,
        version: scenarioMeta.version,
        branch: denormalizedBranch,
    };
}

/**
 * Рекурсивная денормализация ветки
 */
function denormalizeBranch(
    normalizedBranch: NormalizedBranch,
    branches: Record<Guid, NormalizedBranch>,
    steps: Record<Guid, NormalizedStep>,
    relations: Record<Guid, StepRelationDto>
): BranchDto {
    const denormalizedSteps: AnyStepDto[] = normalizedBranch.stepIds
        .map((stepId) => steps[stepId])
        .filter(Boolean)
        .map((normalizedStep) => denormalizeStep(normalizedStep, relations));

    return {
        id: normalizedBranch.id,
        scenarioId: normalizedBranch.scenarioId,
        name: normalizedBranch.name,
        description: normalizedBranch.description,
        waitForCompletion: normalizedBranch.waitForCompletion,
        parallelStepId: normalizedBranch.parallelStepId ?? null,
        conditionStepId: normalizedBranch.conditionStepId ?? null,
        conditionExpression: normalizedBranch.conditionExpression ?? null,
        conditionOrder: normalizedBranch.conditionOrder,
        steps: denormalizedSteps,
        x: normalizedBranch.x,
        y: normalizedBranch.y,
        width: normalizedBranch.width,
        height: normalizedBranch.height,
    };
}

/**
 * Денормализация шага
 */
function denormalizeStep(
    normalizedStep: NormalizedStep,
    relations: Record<Guid, StepRelationDto>
): AnyStepDto {
    const childRelations = normalizedStep.childRelationIds
        .map((id) => relations[id])
        .filter(Boolean);

    const parentRelations = normalizedStep.parentRelationIds
        .map((id) => relations[id])
        .filter(Boolean);

    return {
        ...normalizedStep,
        childRelations,
        parentRelations,
    } as AnyStepDto;
}