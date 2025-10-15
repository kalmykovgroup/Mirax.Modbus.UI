// src/features/scenarioEditor/core/mapScenarioToFlow.ts
import type { ScenarioDto } from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Scenarios/ScenarioDto";
import type { BranchDto } from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/BranchDto";
import { FlowType } from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import type { FlowEdge, FlowNode } from "@/features/scenarioEditor/shared/contracts/models/FlowNode.ts";
 

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
    return n >= 1 && n <= 3 ? `s${n}` : undefined;
};

const DEFAULT_BRANCH_W = 320;
const DEFAULT_BRANCH_H = 100;

export function mapScenarioToFlow(s: ScenarioDto): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const nodesById = new Map<string, FlowNode>();
    const stepRels: StepRel[] = [];
    const branches = getBranches(s);

    for (const br of branches) {
        const bx = Number((br as any).x ?? 0);
        const by = Number((br as any).y ?? 0);

        const wDb = Number((br as any).width);
        const hDb = Number((br as any).height);
        const bw = Number.isFinite(wDb) && wDb > 0 ? wDb : DEFAULT_BRANCH_W;
        const bh = Number.isFinite(hDb) && hDb > 0 ? hDb : DEFAULT_BRANCH_H;

        //  ВАЖНО: устанавливаем __persisted: true для веток, загруженных с сервера
        const branchNode: FlowNode = {
            id: br.id,
            type: FlowType.branchNode,
            position: { x: bx, y: by },
            style: { width: bw, height: bh, zIndex: 0 },
            data: {
                object: br,
                x: bx,
                y: by,
                __persisted: true  //  ДОБАВЛЕНО: ветка уже в БД
            },
        };
        nodes.push(branchNode);
        nodesById.set(branchNode.id, branchNode);

        // Шаги в ветке
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
                style: {
                    ...(typeof (st?.style) === 'object' ? st.style : {}),
                    zIndex: 1
                },
                data: {
                    object: st,
                    x: px,
                    y: py,
                    __persisted: true  //шаг уже в БД
                },
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
            ...(maybeHandle != null ? { sourceHandle: maybeHandle } : {}),
            type: "step",
            data: { order: rel.order ?? undefined },
        });
    }

    return { nodes, edges };
}