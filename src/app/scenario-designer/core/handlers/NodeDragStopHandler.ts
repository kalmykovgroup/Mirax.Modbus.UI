// @app/scenario-designer/core/handlers/NodeDragStopHandler.ts
import type React from 'react'
import type { FlowNode } from '@app/scenario-designer/core/contracts/models/FlowNode.ts'
import { FlowType } from '@app/scenario-designer/core/contracts/types/FlowType.ts'

type Utils = {
    absOf: (n: FlowNode, all: FlowNode[]) => { x: number; y: number }
    rectOf: (n: FlowNode, all: FlowNode[]) => { x: number; y: number; w: number; h: number }
    ensureParentBeforeChild: (nodes: FlowNode[], parentId: string, childId: string) => FlowNode[]
    pickDeepestBranchByTopLeft: (all: FlowNode[], abs: { x: number; y: number }, skipId?: string) => FlowNode | undefined
    isAnyBranchResizing: () => boolean
}

export type NodeDragStopDeps = {
    getAll: () => FlowNode[]
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
    setHoverBranch: (branchId: string | undefined) => void
    ctrlDragIdsRef: React.MutableRefObject<Set<string>>
    utils: Utils
    callbacks?: {
        // движение внутри той же ветки (координаты в абсолюте)
        onStepMoved?: (stepId: string, x: number, y: number) => void
        // прикрепили/перенесли шаг в ветку (меняем branchId, x, y)
        onStepAttachedToBranch?: (stepId: string, branchId: string, x: number, y: number) => void
        // вынесли шаг «на поле» (вне ветки) — удалить шаг и его связи (StepRelation)
        onStepDetachedFromBranch?: (stepId: string) => void
        // авто-рост ветки в UI
        onBranchResized?: (branchId: string, width: number, height: number) => void
    }
}

export class NodeDragStopHandler {
    private readonly getAll
    private readonly setNodes
    private readonly setHoverBranch
    private readonly ctrlDragIdsRef
    private readonly u: Utils
    private readonly callbacks?: NodeDragStopDeps['callbacks']

    constructor(deps: NodeDragStopDeps) {
        this.getAll = deps.getAll
        this.setNodes = deps.setNodes
        this.setHoverBranch = deps.setHoverBranch
        this.ctrlDragIdsRef = deps.ctrlDragIdsRef
        this.u = deps.utils
        this.callbacks = deps.callbacks
    }

    onNodeDragStop = (_e: React.MouseEvent | React.TouchEvent, node: FlowNode) => {
        if (this.u.isAnyBranchResizing()) return

        const all = this.getAll()
        const current = all.find(n => n.id === node.id) ?? node
        //const prevBranchId = current.parentId // прошлый контейнер
        const absTL = this.u.absOf(current, all)
        const target = this.u.pickDeepestBranchByTopLeft(all, absTL, current.id)

        // снять подсветку цели
        this.setHoverBranch(undefined)

        const wasCtrl = this.ctrlDragIdsRef.current.has(current.id)
        if (wasCtrl) this.ctrlDragIdsRef.current.delete(current.id)

        // ─────────────────────────────────────────
        // CTRL + drag
        // ─────────────────────────────────────────
        if (wasCtrl) {
            if (!target) {
                // Вынесли «на поле»: в UI делаем корневой; во внешней логике — удалить шаг + его StepRelation
                this.setNodes(nds =>
                    nds.map(n => {
                        if (n.id !== current.id) return n
                        const { parentId: _pid, extent: _ex, expandParent: _ep, ...rest } = n as FlowNode
                        return { ...rest, position: { x: absTL.x, y: absTL.y } }
                    })
                )
                this.callbacks?.onStepDetachedFromBranch?.(current.id)
                return
            }

            // Ctrl: перенос в ДРУГУЮ ветку — просто меняем branchId и координаты (без детача!)
            if (current.type !== FlowType.branchNode) {
                const br = this.u.rectOf(target, all)
                const relX = absTL.x - br.x
                const relY = absTL.y - br.y

                this.setNodes((nds): FlowNode[] => {
                    let next = nds.map(n =>
                        n.id === current.id
                            ? {
                                ...n,
                                parentId: target.id,
                                position: { x: relX, y: relY },
                                extent: 'parent' as const,
                                expandParent: true
                            }
                            : n
                    )
                    next = this.u.ensureParentBeforeChild(next, target.id, current.id)
                    return next
                })

                // Только апдейт шага: branchId + x,y
                this.callbacks?.onStepAttachedToBranch?.(current.id, target.id, absTL.x, absTL.y)
                return
            }
        }

        // ─────────────────────────────────────────
        // Обычный drag
        // ─────────────────────────────────────────
        if (target && current.type !== FlowType.branchNode) {
            const br = this.u.rectOf(target, all)

            // 1) внутри той же ветки — возможен авто-рост, координаты фиксируем
            if (current.parentId === target.id) {
                const relX = current.position.x
                const relY = current.position.y
                const childW = current.width ?? 0
                const childH = current.height ?? 0

                if (childW > 0 && childH > 0) {
                    const pad = 12
                    const needW = Math.max(br.w, relX + childW + pad)
                    const needH = Math.max(br.h, relY + childH + pad)
                    if (needW !== br.w || needH !== br.h) {
                        this.setNodes((nds): FlowNode[] =>
                            nds.map(n =>
                                n.id === target.id
                                    ? { ...n, style: { ...(n.style ?? {}), width: needW, height: needH } }
                                    : n
                            )
                        )
                        this.callbacks?.onBranchResized?.(target.id, needW, needH)
                    }
                }

                this.callbacks?.onStepMoved?.(current.id, absTL.x, absTL.y)
                return
            }

            // 2) перенос в ДРУГУЮ ветку — только обновляем branchId и координаты (без удаления)
            const relX = absTL.x - br.x
            const relY = absTL.y - br.y
            const childW = current.width ?? 0
            const childH = current.height ?? 0

            this.setNodes((nds): FlowNode[] => {
                let next = nds.map(n =>
                    n.id === current.id
                        ? {
                            ...n,
                            parentId: target.id,
                            position: { x: relX, y: relY },
                            extent: 'parent' as const,
                            expandParent: true
                        }
                        : n
                )

                next = this.u.ensureParentBeforeChild(next, target.id, current.id)

                if (childW > 0 && childH > 0) {
                    const pad = 12
                    const needW = Math.max(br.w, relX + childW + pad)
                    const needH = Math.max(br.h, relY + childH + pad)
                    next = next.map(n =>
                        n.id === target.id
                            ? { ...n, style: { ...(n.style ?? {}), width: needW, height: needH } }
                            : n
                    )
                }
                return next
            })

            this.callbacks?.onStepAttachedToBranch?.(current.id, target.id, absTL.x, absTL.y)

            // дублируем уведомление о возможном авто-росте ветки
            if (childW > 0 && childH > 0) {
                const pad = 12
                const needW = Math.max(br.w, relX + childW + pad)
                const needH = Math.max(br.h, relY + childH + pad)
                this.callbacks?.onBranchResized?.(target.id, needW, needH)
            }
            return
        }

        // Без ctrl — «на поле» не уходим
    }
}
