// src/features/scenarioEditor/store/scenarioNormalization.ts

import type { ScenarioDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Scenarios/ScenarioDto';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import type { Guid } from '@app/lib/types/Guid';
import type { NormalizedBranch, NormalizedStep } from './scenarioSlice';

export interface NormalizedScenarioData {
    readonly branches: readonly NormalizedBranch[];
    readonly steps: readonly NormalizedStep[];
    readonly relations: readonly StepRelationDto[];
}

/**
 * Нормализует ScenarioDto в плоские массивы для быстрого доступа.
 * Сохраняет связи через ID-ссылки для понимания вложенности.
 */
export function normalizeScenario(scenario: ScenarioDto): NormalizedScenarioData {
    const branches: NormalizedBranch[] = [];
    const steps: NormalizedStep[] = [];
    const relations: StepRelationDto[] = [];
    const processedRelationIds = new Set<Guid>();

    normalizeBranchRecursive(
        scenario.branch,
        scenario.id,
        null,
        branches,
        steps,
        relations,
        processedRelationIds
    );

    return { branches, steps, relations };
}

function normalizeBranchRecursive(
    branch: BranchDto,
    scenarioId: Guid,
    parentStepId: Guid | null,
    branches: NormalizedBranch[],
    steps: NormalizedStep[],
    relations: StepRelationDto[],
    processedRelationIds: Set<Guid>
): void {
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

    for (const step of branch.steps) {
        const normalizedStep: NormalizedStep = {
            ...step,
            branchId: branch.id,
            childRelationIds: step.childRelations.map((r) => r.id),
            parentRelationIds: step.parentRelations.map((r) => r.id),
        };

        steps.push(normalizedStep);

        for (const relation of step.childRelations) {
            if (!processedRelationIds.has(relation.id)) {
                relations.push(relation);
                processedRelationIds.add(relation.id);
            }
        }

        for (const relation of step.parentRelations) {
            if (!processedRelationIds.has(relation.id)) {
                relations.push(relation);
                processedRelationIds.add(relation.id);
            }
        }

        if ('stepBranchRelations' in step) {
            const branchRelations = (step as any).stepBranchRelations as
                | readonly { branchId: Guid; branch?: BranchDto | undefined }[]
                | undefined;

            if (branchRelations != null) {
                for (const rel of branchRelations) {
                    if (rel.branch != null) {
                        normalizeBranchRecursive(
                            rel.branch,
                            scenarioId,
                            step.id,
                            branches,
                            steps,
                            relations,
                            processedRelationIds
                        );
                    }
                }
            }
        }
    }
}