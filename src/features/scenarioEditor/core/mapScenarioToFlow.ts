// src/features/scenarioEditor/core/mapScenarioToFlow.ts
import type { ScenarioDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Scenarios/ScenarioDto';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import {nodeTypeRegistry} from "@scenario/shared/contracts/registry/NodeTypeRegistry.ts";

interface StepRel {
    readonly parentStepId: string;
    readonly childStepId: string;
    readonly order?: number | null | undefined;
}

function getBranches(s: ScenarioDto): ReadonlyArray<BranchDto> {
    const any = s as any;
    return [
        ...('branch' in any && any.branch != null ? [any.branch as BranchDto] : []),
        ...((any.branches ?? []) as BranchDto[]),
    ];
}

function handleFromOrder(order: unknown): string | undefined {
    const n = Number(order);
    return n >= 1 && n <= 3 ? `s${n}` : undefined;
}

export function mapScenarioToFlow(s: ScenarioDto): {
    readonly nodes: Array<FlowNode>;
    readonly edges: Array<FlowEdge>;
} {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const nodesById = new Map<string, FlowNode>();
    const stepRels: StepRel[] = [];
    const branches = getBranches(s);

    // Обрабатываем ветки
    for (const branchDto of branches) {
        // ✅ Получаем контракт для ветки
        const branchContract = nodeTypeRegistry.get(FlowType.branchNode);
        if (branchContract === undefined) {
            console.error(`Контракт для ${FlowType.branchNode} не зарегистрирован`);
            continue;
        }

        // ✅ Используем mapFromDto из контракта
        const mapped = branchContract.mapFromDto(branchDto, undefined);

        const branchNode: FlowNode = {
            id: mapped.id,
            type: FlowType.branchNode,
            position: mapped.position,
            data: mapped.data, // FlowNodeData<BranchDto> с __persisted: true
            style: mapped.style,
            parentId: mapped.parentId,
            extent: mapped.extent,
            expandParent: mapped.expandParent,
        };

        nodes.push(branchNode);
        nodesById.set(branchNode.id, branchNode);

        // Обрабатываем шаги внутри ветки
        const steps: readonly any[] = (branchDto as any).steps ?? [];
        for (const stepDto of steps) {
            const dbType = Number(stepDto?.type);

            // ✅ Получаем контракт для шага по dbTypeId
            const stepContract = nodeTypeRegistry.getByDbType(dbType);
            if (stepContract === undefined) {
                console.warn(`Контракт для dbType=${dbType} не найден, пропускаем шаг ${stepDto.id}`);
                continue;
            }

            // ✅ Используем mapFromDto из контракта
            const stepMapped = stepContract.mapFromDto(stepDto, branchDto.id);

            const stepNode: FlowNode = {
                id: stepMapped.id,
                type: stepContract.type,
                position: stepMapped.position,
                data: stepMapped.data, // FlowNodeData<XxxDto> с __persisted: true
                style: stepMapped.style,
                parentId: stepMapped.parentId,
                extent: stepMapped.extent,
                expandParent: stepMapped.expandParent,
            };

            nodes.push(stepNode);
            nodesById.set(stepNode.id, stepNode);

            // Собираем связи между шагами
            const rels: readonly any[] = Array.isArray(stepDto.childRelations)
                ? stepDto.childRelations
                : [];
            for (const r of rels) {
                stepRels.push({
                    parentStepId: r.parentStepId,
                    childStepId: r.childStepId,
                    order: r.conditionOrder ?? null,
                });
            }
        }

        // Создаём branchLink edges (owner → branch)
        const ownerParallel: string | undefined = (branchDto as any).parallelStepId ?? undefined;
        const ownerCondition: string | undefined = (branchDto as any).conditionStepId ?? undefined;
        const condExpr: string | undefined = (branchDto as any).conditionExpression ?? undefined;
        const condOrder: number | undefined = (branchDto as any).conditionOrder ?? undefined;

        if (ownerParallel !== undefined) {
            edges.push({
                id: `bl:par:${ownerParallel}->${branchDto.id}`,
                source: ownerParallel,
                target: branchDto.id,
                type: 'branchLink',
                targetHandle: 't1',
                data: {
                    mode: 'parallel',
                    label: condOrder !== undefined ? `#${condOrder}` : undefined,
                },
            });
        } else if (ownerCondition !== undefined) {
            edges.push({
                id: `bl:cond:${ownerCondition}->${branchDto.id}`,
                source: ownerCondition,
                target: branchDto.id,
                sourceHandle: handleFromOrder(condOrder) ?? null,
                targetHandle: 't1',
                type: 'branchLink',
                data: {
                    mode: 'condition',
                    label:
                        (condExpr ?? '').trim() ||
                        (condOrder !== undefined ? `#${condOrder}` : undefined),
                },
            });
        }
    }

    // Создаём step → step edges
    for (const rel of stepRels) {
        const src = nodesById.get(rel.parentStepId);
        const dst = nodesById.get(rel.childStepId);
        if (src === undefined || dst === undefined) continue;

        const maybeHandle =
            src.type === FlowType.conditionStepNode && rel.order != null
                ? handleFromOrder(rel.order)
                : undefined;

        edges.push({
            id: `sr:${rel.parentStepId}->${rel.childStepId}`,
            source: rel.parentStepId,
            target: rel.childStepId,
            ...(maybeHandle !== undefined ? { sourceHandle: maybeHandle } : {}),
            type: 'step',
            data: { order: rel.order ?? undefined },
        });
    }

    return { nodes, edges };
}