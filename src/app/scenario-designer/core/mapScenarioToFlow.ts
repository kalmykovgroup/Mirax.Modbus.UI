// src/app/scenario-designer/adapters/mapScenarioToFlow.ts
import type { ScenarioDto } from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Scenarios/ScenarioDto";
import type { BranchDto } from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/BranchDto";
import {FlowType} from "@app/scenario-designer/core/contracts/types/FlowType.ts";
import type {FlowEdge, FlowNode} from "@app/scenario-designer/core/contracts/models/FlowNode.ts";
const stepTypeToFlow: Record<number, FlowType> = {
    1: FlowType.activityModbusNode,
    2: FlowType.delayStepNode,
    3: FlowType.conditionStepNode,
    4: FlowType.parallelStepNode,
    5: FlowType.signalStepNode,
    6: FlowType.jumpStepNode,
};
const flowFromDb = (t: unknown): FlowType =>
    stepTypeToFlow[Number(t)] ?? FlowType.activitySystemNode;

type StepRel = { parentStepId: string; childStepId: string; order?: number | null };

const getBranches = (s: ScenarioDto): BranchDto[] => {
    const any = s as any;
    return [
        ...(any.branch ? [any.branch as BranchDto] : []),
        ...((any.branches ?? []) as BranchDto[]),
    ];
};

const handleFromOrder = (order: unknown): string | undefined => {
    const n = Number(order);
    // если у Condition определены 3 исходящих хендла s1..s3
    return n >= 1 && n <= 3 ? `s${n}` : undefined;
};

export function mapScenarioToFlow(s: ScenarioDto): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const nodesById = new Map<string, FlowNode>();
    const stepRels: StepRel[] = [];
    const branches = getBranches(s);

    for (const br of branches) {
        // строго из БД
        const bx = Number((br as any).x ?? 0);
        const by = Number((br as any).y ?? 0);
        const bw = Number((br as any).width ?? 0);
        const bh = Number((br as any).height ?? 0);

        const branchNode: FlowNode = {
            id: br.id,
            type: FlowType.branchNode,
            position: { x: bx, y: by },
            style: { width: bw, height: bh, zIndex: 0 }, // 👈 ветка ниже
            data: { object: br, x: bx, y: by },
        };
        nodes.push(branchNode);
        nodesById.set(branchNode.id, branchNode);

        // шаги строго из БД
        (br as any).steps?.forEach((st: any) => {
            const px = Number(st?.x ?? 0);
            const py = Number(st?.y ?? 0);

            const node: FlowNode = {
                id: st.id,
                type: flowFromDb(st?.type),
                parentId: br.id,
                position: { x: px, y: py },
                extent: "parent",
                expandParent: true,
                // шаг – выше ветки
                style: { ...(typeof (st?.style) === 'object' ? st.style : {}), zIndex: 1 },
                data: { object: st, x: px, y: py },
            };
            nodes.push(node);
            nodesById.set(node.id, node);

            const rels: any[] = Array.isArray(st.childRelations) ? st.childRelations : [];
            for (const r of rels) {
                stepRels.push({
                    parentStepId: r.parentStepId,
                    childStepId: r.childStepId,
                    order: r.conditionOrder ?? null,
                });
            }
        });

        // branchLink edges (owner → branch)
        const ownerParallel: string | undefined = (br as any).parallelStepId ?? undefined;
        const ownerCondition: string | undefined = (br as any).conditionStepId ?? undefined;
        const condExpr: string | undefined = (br as any).conditionExpression ?? undefined;
        const condOrder: number | undefined = (br as any).conditionOrder ?? undefined;

        if (ownerParallel) {
            edges.push({
                id: `bl:par:${ownerParallel}->${br.id}`,
                source: ownerParallel,
                target: br.id,
                type: "branchLink",
                targetHandle: "t1",
                data: { mode: "parallel", label: condOrder ? `#${condOrder}` : undefined },
            });
        } else if (ownerCondition) {
            edges.push({
                id: `bl:cond:${ownerCondition}->${br.id}`,
                source: ownerCondition,
                target: br.id,
                // ВАЖНО: не допускаем undefined при exactOptionalPropertyTypes
                sourceHandle: handleFromOrder(condOrder) ?? null,
                targetHandle: "t1",
                type: "branchLink",
                data: {
                    mode: "condition",
                    label: (condExpr ?? "").trim() || (condOrder ? `#${condOrder}` : undefined),
                },
            });
        }
    }

    // step -> step edges
    for (const rel of stepRels) {
        const src = nodesById.get(rel.parentStepId);
        const dst = nodesById.get(rel.childStepId);
        if (!src || !dst) continue;

        const maybeHandle =
            src.type === FlowType.conditionStepNode ? handleFromOrder(rel.order) : undefined;

        edges.push({
            id: `sr:${rel.parentStepId}->${rel.childStepId}`,
            source: rel.parentStepId,
            target: rel.childStepId,
            // Если handle не вычислился — просто не указываем свойство
            ...(maybeHandle != null ? { sourceHandle: maybeHandle } : {}),
            type: "step",
            data: { order: rel.order ?? undefined },
        });
    }

    return { nodes, edges };
}
