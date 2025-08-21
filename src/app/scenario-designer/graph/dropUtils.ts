// src/app/scenario-designer/graph/dnd/dropUtils.ts
import type {ReactFlowInstance} from '@xyflow/react';
import type {FlowNode} from '@app/scenario-designer/types/FlowNode.ts';
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";

// ——— базовые helpers ———
export const getAll = (rf: ReactFlowInstance<FlowNode>) => rf.getNodes() as FlowNode[];
export const byId = (all: FlowNode[], id?: string) => (id ? all.find(n => n.id === id) : undefined);

export const absOf = (n: FlowNode, all: FlowNode[]) => {
    let x = n.position.x, y = n.position.y;
    let p = byId(all, n.parentId);
    while (p) { x += p.position.x; y += p.position.y; p = byId(all, p.parentId); }
    return { x, y };
};

export const rectOf = (n: FlowNode, all: FlowNode[]) => {
    const { x, y } = absOf(n, all);

    // 1) сначала измеренные размеры RF
    let w = n.width ?? 0;
    let h = n.height ?? 0;

    // 2) если RF ещё не измерил — пробуем style.width/height (мы задаём их при создании ветки)
    const styleW = typeof (n.style as any)?.width === 'number' ? (n.style as any).width as number : undefined;
    const styleH = typeof (n.style as any)?.height === 'number' ? (n.style as any).height as number : undefined;
    if (!w && styleW) w = styleW;
    if (!h && styleH) h = styleH;

    // 3) крайний случай: новая branch может быть ещё «пустая» — даём разумный дефолт
    if ((!w || !h) && n.type === FlowType.branchNode) {
        w = w || 300;
        h = h || 100;
    }

    return { x, y, w, h };
};

const depthOf = (n: FlowNode, all: FlowNode[]) => {
    let d = 0, p = byId(all, n.parentId);
    while (p) { d++; p = byId(all, p.parentId); }
    return d;
};

// ——— цель: самая «глубокая» ветка под top-left точкой ———
export const pickDeepestBranchByTopLeft = (
    all: FlowNode[],
    ptAbs: { x: number; y: number },
    ignoreId?: string
) => {
    const hits = all.filter(n => n.type === FlowType.branchNode && n.id !== ignoreId)
        .filter(b => {
            const r = rectOf(b, all);
            return ptAbs.x >= r.x && ptAbs.x <= r.x + r.w && ptAbs.y >= r.y && ptAbs.y <= r.y + r.h;
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

        // гарантируем, что parent стоит перед child
        const parentIdx = next.findIndex(n => n.id === target.id);
        const childIdx  = next.findIndex(n => n.id === nodeId);
        if (parentIdx !== -1 && childIdx !== -1 && childIdx < parentIdx) {
            const [child] = next.splice(childIdx, 1);
            const newParentIdx = next.findIndex(n => n.id === target.id);
            next.splice(newParentIdx + 1, 0, child);
        }

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

// ——— вынести на поле (Ctrl-drag): снять parentId и поставить абсолютную позицию ———
export const detachToField = (
    setNodes: (updater: (nds: FlowNode[]) => FlowNode[]) => void,
    nodeId: string,
    abs: { x: number; y: number }
) =>
    setNodes((nds): FlowNode[] =>
        nds.map(n =>
            n.id === nodeId
                ? { ...n, parentId: undefined, position: { x: abs.x, y: abs.y }, extent: undefined, expandParent: undefined }
                : n
        )
    );
