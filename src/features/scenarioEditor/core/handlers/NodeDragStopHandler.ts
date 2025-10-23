// @scenario/core/handlers/NodeDragStopHandler.ts
import type React from 'react';
import type { FlowNode, FlowEdge } from '@/features/scenarioEditor/shared/contracts/models/FlowNode.ts';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';

type Utils = {
    absOf: (n: FlowNode, all: FlowNode[]) => { x: number; y: number };
    rectOf: (n: FlowNode, all: FlowNode[]) => { x: number; y: number; w: number; h: number };
    ensureParentBeforeChild: (nodes: FlowNode[], parentId: string, childId: string) => FlowNode[];
    pickDeepestBranchByTopLeft: (
        all: FlowNode[],
        abs: { x: number; y: number },
        skipId?: string
    ) => FlowNode | undefined;
};

export type NodeDragStopDeps = {
    getAll: () => FlowNode[];
    getAllEdges: () => FlowEdge[];
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
    setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
    setHoverBranch: (branchId: string | undefined) => void;
    shiftDragIdsRef: React.MutableRefObject<Set<string>>;
    utils: Utils;
    callbacks?: {
        // Движение внутри той же ветки (координаты в абсолюте)
        onStepMoved?: (stepId: string, x: number, y: number) => void;
        // Прикрепили/перенесли шаг в ветку (меняем branchId, x, y)
        onStepAttachedToBranch?: (stepId: string, branchId: string, x: number, y: number) => void;
        // Вынесли шаг «на поле» (вне ветки) — удалить шаг, его связи и саму ноду из сценария
        onStepDetachedFromBranch?: (stepId: string) => void;
        // Удалить связь между нодами
        onConnectionRemoved?: (sourceId: string, targetId: string, edgeId: string) => void;
        // Авто-рост ветки в UI
        onBranchResized?: (branchId: string, width: number, height: number) => void;
    };
};

export class NodeDragStopHandler {
    private readonly getAll;
    private readonly getAllEdges;
    private readonly setNodes;
    private readonly setEdges;
    private readonly setHoverBranch;
    private readonly shiftDragIdsRef;
    private readonly u: Utils;
    private readonly callbacks?: NodeDragStopDeps['callbacks'];

    constructor(deps: NodeDragStopDeps) {
        this.getAll = deps.getAll;
        this.getAllEdges = deps.getAllEdges;
        this.setNodes = deps.setNodes;
        this.setEdges = deps.setEdges;
        this.setHoverBranch = deps.setHoverBranch;
        this.shiftDragIdsRef = deps.shiftDragIdsRef;
        this.u = deps.utils;
        this.callbacks = deps.callbacks;
    }

    private removeNodeConnections = (nodeId: string): void => {
        const edges = this.getAllEdges();
        const connectedEdges = edges.filter(
            (e) => e.source === nodeId || e.target === nodeId
        );

        if (connectedEdges.length > 0) {
            console.log(
                `[NodeDragStopHandler] 🗑️ Removing ${connectedEdges.length} connections for node ${nodeId}`
            );

            // Удаляем рёбра из UI
            this.setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));

            // Вызываем коллбэки для каждого удалённого ребра
            for (const edge of connectedEdges) {
                this.callbacks?.onConnectionRemoved?.(edge.source, edge.target, edge.id);
            }
        }
    };

    onNodeDragStop = (_e: React.MouseEvent | React.TouchEvent, node: FlowNode): void => {

        const all = this.getAll();
        const current = all.find((n) => n.id === node.id) ?? node;
        const absTL = this.u.absOf(current, all);
        const target = this.u.pickDeepestBranchByTopLeft(all, absTL, current.id);

        // Снять подсветку цели
        this.setHoverBranch(undefined);

        const wasShift = this.shiftDragIdsRef.current.has(current.id);
        if (wasShift) this.shiftDragIdsRef.current.delete(current.id);

        // ─────────────────────────────────────────
        // SHIFT + drag (вынос из ветки)
        // ─────────────────────────────────────────
        if (wasShift) {
            if (!target) {
                // Вынесли «на поле» с Shift: удаляем связи и саму ноду
                console.log(
                    `[NodeDragStopHandler] 🔀 SHIFT + DRAG TO FIELD | Node: ${current.id} | Removing connections and node`
                );

                // 1. Удаляем все связи ноды
                this.removeNodeConnections(current.id);

                // 2. Убираем parentId из ноды (делаем корневой визуально)
                this.setNodes((nds) =>
                    nds.map((n) => {
                        if (n.id !== current.id) return n;
                        const { parentId: _pid, extent: _ex, expandParent: _ep, ...rest } = n as FlowNode;
                        return { ...rest, position: { x: absTL.x, y: absTL.y } };
                    })
                );

                // 3. Вызываем коллбэк для полного удаления шага из сценария
                this.callbacks?.onStepDetachedFromBranch?.(current.id);
                return;
            }

            // Shift: перенос в ДРУГУЮ ветку — просто меняем branchId и координаты (без удаления связей!)
            if (current.type !== FlowType.BranchNode) {
                const br = this.u.rectOf(target, all);
                const relX = absTL.x - br.x;
                const relY = absTL.y - br.y;

                console.log(
                    `[NodeDragStopHandler] 🔀 SHIFT + DRAG TO BRANCH | Node: ${current.id} | Target: ${target.id}`
                );

                this.setNodes((nds): FlowNode[] => {
                    let next = nds.map((n) =>
                        n.id === current.id
                            ? {
                                ...n,
                                parentId: target.id,
                                position: { x: relX, y: relY },
                                extent: 'parent' as const,
                                expandParent: true,
                            }
                            : n
                    );
                    next = this.u.ensureParentBeforeChild(next, target.id, current.id);
                    return next;
                });

                // Только апдейт шага: branchId + x,y
                this.callbacks?.onStepAttachedToBranch?.(current.id, target.id, absTL.x, absTL.y);
                return;
            }
        }

        // ─────────────────────────────────────────
        // Обычный drag (без Shift)
        // ─────────────────────────────────────────
        if (target && current.type !== FlowType.BranchNode) {
            const br = this.u.rectOf(target, all);

            // 1) Внутри той же ветки — возможен авто-рост, координаты фиксируем
            if (current.parentId === target.id) {
                const relX = current.position.x;
                const relY = current.position.y;
                const childW = current.width ?? 0;
                const childH = current.height ?? 0;

                if (childW > 0 && childH > 0) {
                    const pad = 12;
                    const needW = Math.max(br.w, relX + childW + pad);
                    const needH = Math.max(br.h, relY + childH + pad);
                    if (needW !== br.w || needH !== br.h) {
                        this.setNodes((nds): FlowNode[] =>
                            nds.map((n) =>
                                n.id === target.id
                                    ? { ...n, style: { ...(n.style ?? {}), width: needW, height: needH } }
                                    : n
                            )
                        );
                        this.callbacks?.onBranchResized?.(target.id, needW, needH);
                    }
                }

                this.callbacks?.onStepMoved?.(current.id, absTL.x, absTL.y);
                return;
            }

            // 2) Перенос в ДРУГУЮ ветку (обычный drag без Shift) — только обновляем branchId и координаты
            const relX = absTL.x - br.x;
            const relY = absTL.y - br.y;
            const childW = current.width ?? 0;
            const childH = current.height ?? 0;

            this.setNodes((nds): FlowNode[] => {
                let next = nds.map((n) =>
                    n.id === current.id
                        ? {
                            ...n,
                            parentId: target.id,
                            position: { x: relX, y: relY },
                            extent: 'parent' as const,
                            expandParent: true,
                        }
                        : n
                );

                next = this.u.ensureParentBeforeChild(next, target.id, current.id);

                if (childW > 0 && childH > 0) {
                    const pad = 12;
                    const needW = Math.max(br.w, relX + childW + pad);
                    const needH = Math.max(br.h, relY + childH + pad);
                    next = next.map((n) =>
                        n.id === target.id
                            ? { ...n, style: { ...(n.style ?? {}), width: needW, height: needH } }
                            : n
                    );
                }
                return next;
            });

            this.callbacks?.onStepAttachedToBranch?.(current.id, target.id, absTL.x, absTL.y);

            // Дублируем уведомление о возможном авто-росте ветки
            if (childW > 0 && childH > 0) {
                const pad = 12;
                const needW = Math.max(br.w, relX + childW + pad);
                const needH = Math.max(br.h, relY + childH + pad);
                this.callbacks?.onBranchResized?.(target.id, needW, needH);
            }
            return;
        }

        // Без Shift — «на поле» не уходим
    };
}