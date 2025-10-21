// src/features/scenarioEditor/core/mapScenarioToFlow.ts

import type { RootState } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { nodeTypeRegistry } from '@scenario/shared/contracts/registry/NodeTypeRegistry';
import {
    selectBranchesByScenarioId,
    selectStepsByBranchId,
    selectChildRelationsByStepId,
    selectChildBranchesOfStep,
} from '@scenario/store/scenarioSelectors';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';

function handleFromOrder(order: unknown): string | undefined {
    const n = Number(order);
    return n >= 1 && n <= 3 ? `s${n}` : undefined;
}

export function mapScenarioToFlow(
    state: RootState,
    scenarioId: Guid
): {
    readonly nodes: readonly FlowNode[];
    readonly edges: readonly FlowEdge[];
} {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const addedEdgeKeys = new Set<string>();

    const branches = selectBranchesByScenarioId(state, scenarioId);

    for (const branch of branches) {
        const branchContract = nodeTypeRegistry.get(FlowType.BranchNode);
        if (branchContract == null) {
            console.error(`Контракт для ${FlowType.BranchNode} не зарегистрирован`);
            continue;
        }

        const branchNode = branchContract.mapFromDto(branch, undefined);
        nodes.push(branchNode);

        const steps = selectStepsByBranchId(state, branch.id);

        for (const step of steps) {
            // Используем getByStepType для получения контракта по StepType enum
            const stepContract = nodeTypeRegistry.get(step.type);

            if (stepContract == null) {
                console.warn(
                    `Контракт для StepType=${step.type} (${StepType[step.type]}) не найден, пропускаем шаг ${step.id}`
                );
                continue;
            }

            const stepNode = stepContract.mapFromDto(step, branch.id);
            nodes.push(stepNode);

            const childRelations = selectChildRelationsByStepId(state, step.id);

            for (const rel of childRelations) {
                if (addedEdgeKeys.has(rel.id)) {
                    continue;
                }

                const maybeHandle =
                    rel.conditionOrder != null ? handleFromOrder(rel.conditionOrder) : undefined;

                edges.push({
                    id: rel.id,
                    source: rel.parentStepId,
                    target: rel.childStepId,
                    ...(maybeHandle != null ? { sourceHandle: maybeHandle } : {}),
                    type: 'step',
                    data: { order: rel.conditionOrder ?? undefined },
                });

                addedEdgeKeys.add(rel.id);
            }

            if (stepContract.canHaveChildBranches === true) {
                const childBranches = selectChildBranchesOfStep(state, step.id);
                const mode = stepContract.getBranchLinkMode?.(step);

                if (mode == null) continue;

                for (const childBranch of childBranches) {
                    const edgeKey = `bl:${mode}:${step.id}->${childBranch.id}`;

                    if (addedEdgeKeys.has(edgeKey)) continue;

                    const isCondition = mode === 'condition';

                    edges.push({
                        id: edgeKey,
                        source: step.id,
                        target: childBranch.id,
                        sourceHandle:
                            isCondition && childBranch.conditionOrder != null
                                ? handleFromOrder(childBranch.conditionOrder) ?? null
                                : null,
                        targetHandle: 't1',
                        type: 'branchLink',
                        data: {
                            mode,
                            label:
                                isCondition
                                    ? (childBranch.conditionExpression ?? '').trim() ||
                                    (childBranch.conditionOrder != null
                                        ? `#${childBranch.conditionOrder}`
                                        : undefined)
                                    : childBranch.conditionOrder != null
                                        ? `#${childBranch.conditionOrder}`
                                        : undefined,
                        },
                    });

                    addedEdgeKeys.add(edgeKey);
                }
            }
        }
    }

    return { nodes, edges };
}