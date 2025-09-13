// src/app/scenario-designer/graph/dnd/dropUtils.ts
import type {ReactFlowInstance} from '@xyflow/react';
import type {FlowNode} from "@/features/scenarioEditor/shared/contracts/models/FlowNode.ts";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";

// ——— базовые helpers ———
export const getAll = (rf: ReactFlowInstance<FlowNode>) => rf.getNodes() as FlowNode[];
export const byId = (all: FlowNode[], id?: string) => (id ? all.find(n => n.id === id) : undefined);

export const absOf = (n: FlowNode, all: FlowNode[]) => {
    let x = n.position.x, y = n.position.y;
    let p = byId(all, n.parentId);
    while (p) { x += p.position.x; y += p.position.y; p = byId(all, p.parentId); }
    return { x, y };
};

const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/** ВАЖНО: никаких CSS-классов и дефолтов. Только:
 * 1) измеренное RF (node.width/height), 2) ЧИСЛОВОЙ inline style.
 * Иначе — ошибка для веток.
 */
export const rectOf = (n: FlowNode, all: FlowNode[]) => {
    const { x, y } = absOf(n, all);

    let w = num(n.width) ?? num((n.style as any)?.width);
    let h = num(n.height) ?? num((n.style as any)?.height);

    if ((w ?? 0) <= 0 || (h ?? 0) <= 0) {
        if (n.type === FlowType.branchNode) {
            throw new Error(`Branch '${n.id}' has no numeric width/height at hit-test time`);
        }
        // для не-веток возвращаем 0×0 — они не цели хит-теста
        w = w ?? 0;
        h = h ?? 0;
    }

    return { x, y, w: w!, h: h! };
};



const depthOf = (n: FlowNode, all: FlowNode[]) => {
    let d = 0, p = byId(all, n.parentId);
    while (p) { d++; p = byId(all, p.parentId); }
    return d;
};

const ptInRect = (pt:{x:number;y:number}, r:{x:number;y:number;w:number;h:number}) =>
    pt.x >= r.x && pt.y >= r.y && pt.x <= r.x + r.w && pt.y <= r.y + r.h;

// ✔️ Если ветка ещё не измерена (w/h == 0) — НЕ считаем её цельной областью
export const pickDeepestBranchByTopLeft = (
    all: FlowNode[],
    ptAbs: { x: number; y: number },
    ignoreId?: string
) => {
    const hits = all
        .filter(n => n.type === FlowType.branchNode && n.id !== ignoreId)
        .filter(b => {
            const r = rectOf(b, all);
            if (r.w === 0 || r.h === 0) return false; // ещё не измерено/не задан inline размер
            return ptInRect(ptAbs, r);
        })
        .sort((a, b) => depthOf(b, all) - depthOf(a, all));
    return hits[0];
};

// ——— подсветка ветки-цели ———
export const setHoverBranch = (setNodes: (updater: (nds: FlowNode[]) => FlowNode[]) => void, branchId: string | null) =>
    setNodes((nds): FlowNode[] =>
        nds.map(n =>
            n.type === FlowType.branchNode
                ? { ...n, data: { ...n.data, isDropTarget: branchId != null && n.id === branchId } }
                : n
        )
    );

// ——— применить дроп: сделать nodeId дочерним target, позиция от top-left, при желании подрастить ветку ———
export const commitDropToBranch = (
    setNodes: (updater: (nds: FlowNode[]) => FlowNode[]) => void,
    all: FlowNode[],
    target: FlowNode,
    nodeId: string,
    dropAbs: { x: number; y: number },
    growBranch: boolean
) => {
    const br = rectOf(target, all);
    const relX = dropAbs.x - br.x;
    const relY = dropAbs.y - br.y;

    setNodes((nds): FlowNode[] => {
        // 1) делаем дочерним
        let next = nds.map(n =>
            n.id === nodeId
                ? {
                    ...n,
                    parentId: target.id,
                    position: { x: relX, y: relY },
                    extent: 'parent' as const,
                    expandParent: true,
                }
                : n
        );

        next = ensureParentBeforeChild(next, target.id, nodeId);

        if (!growBranch) return next;

        // 2) если размеры известны — гарантируем вместимость ветки
         // после мапы у нас актуальные данные
        const child = next.find(n => n.id === nodeId);
        const childW = child?.width ?? 0;
        const childH = child?.height ?? 0;

        // если пока 0 — RF ещё не измерил, роста не делаем (избегаем артефактов)
        if (childW === 0 || childH === 0) return next;

        const pad = 12;
        const needW = Math.max(br.w, relX + childW + pad);
        const needH = Math.max(br.h, relY + childH + pad);

        return next.map(n =>
            n.id === target.id
                ? { ...n, style: { ...(n.style ?? {}), width: needW, height: needH } }
                : n
        );
    });
};


export function ensureParentBeforeChild(list: FlowNode[], parentId: string, childId: string): FlowNode[] {
    const next = [...list];
    const pIdx = next.findIndex(n => n.id === parentId);
    const cIdx = next.findIndex(n => n.id === childId);
    if (pIdx === -1 || cIdx === -1) return next;
    // Родитель должен быть ПЕРЕД ребёнком
    if (cIdx <= pIdx) {

        const [child] = next.splice(cIdx, 1);

        if (child == undefined) {
            throw new Error(`No parent child with id ${childId}`);
        }

        const newParentIdx = next.findIndex(n => n.id === parentId);
        next.splice(newParentIdx + 1, 0, child);
    }
    return next;
}


