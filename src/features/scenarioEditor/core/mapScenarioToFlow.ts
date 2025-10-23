// src/features/scenarioEditor/core/mapScenarioToFlow.ts
// 🚀 ОПТИМИЗИРОВАННАЯ ВЕРСИЯ (ИСПРАВЛЕНО): Batch selectors вместо циклов

import type { RootState } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { nodeTypeRegistry } from '@scenario/shared/contracts/registry/NodeTypeRegistry';
import {
    selectBranchesByScenarioId,
    selectStepsByBranchId,
} from '@scenario/store/scenarioSelectors';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';

function handleFromOrder(order: unknown): string | undefined {
    const n = Number(order);
    return n >= 1 && n <= 3 ? `s${n}` : undefined;
}

// 🔥 Helper: Группировка массива по ключу
function groupBy<T>(array: T[], keyFn: (item: T) => string | undefined): Map<string, T[]> {
    const map = new Map<string, T[]>();

    for (const item of array) {
        const key = keyFn(item);
        if (key === undefined) continue;

        const existing = map.get(key);
        if (existing) {
            existing.push(item);
        } else {
            map.set(key, [item]);
        }
    }

    return map;
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

    // 🚀 ОПТИМИЗАЦИЯ: Получаем ВСЕ данные один раз
    const branches = selectBranchesByScenarioId(state, scenarioId);
    const allRelations = Object.values(state.scenario.relations);
    const allBranches = Object.values(state.scenario.branches);

    // 🚀 ОПТИМИЗАЦИЯ: Группируем relations по parentStepId для O(1) lookup
    const relationsByParentStepId = groupBy(
        allRelations,
        (rel) => rel.parentStepId
    );

    // 🚀 ИСПРАВЛЕНО: Child branches связаны через parallelStepId ИЛИ conditionStepId
    const childBranchesByParallelStepId = groupBy(
        allBranches.filter((b) => b.parallelStepId != null),
        (b) => b.parallelStepId!
    );

    const childBranchesByConditionStepId = groupBy(
        allBranches.filter((b) => b.conditionStepId != null),
        (b) => b.conditionStepId!
    );

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
            const stepContract = nodeTypeRegistry.get(step.type);

            if (stepContract == null) {
                console.warn(
                    `Контракт для StepType=${step.type} (${StepType[step.type]}) не найден, пропускаем шаг ${step.id}`
                );
                continue;
            }

            const stepNode = stepContract.mapFromDto(step, branch.id);
            nodes.push(stepNode);

            // 🚀 ОПТИМИЗАЦИЯ: O(1) lookup вместо селектора
            const childRelations = relationsByParentStepId.get(step.id) ?? [];

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
                const mode = stepContract.getBranchLinkMode?.(step);

                if (mode == null) continue;

                // 🚀 ИСПРАВЛЕНО: Получаем child branches из правильной Map
                const childBranches =
                    mode === 'parallel'
                        ? childBranchesByParallelStepId.get(step.id) ?? []
                        : childBranchesByConditionStepId.get(step.id) ?? [];

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