import type { Edge } from '@xyflow/react';

type ConnLike = {
    source?: string | null;
    target?: string | null;
    sourceHandle?: string | null | undefined;
    targetHandle?: string | null | undefined;
};

/** Проверка дубликата ребра с учётом handleId */
export function isDuplicateEdgeArray(edges: Edge[], c: ConnLike) {
    const s = c.source ?? null;
    const t = c.target ?? null;
    if (!s || !t) return false;

    return edges.some(
        (e) =>
            e.source === s &&
            e.target === t &&
            (e.sourceHandle ?? null) === (c.sourceHandle ?? null) &&
            (e.targetHandle ?? null) === (c.targetHandle ?? null)
    );
}
