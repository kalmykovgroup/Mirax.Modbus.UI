// src/app/scenario-designer/core/handlers/HoverBranchService.ts
import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode'
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts'

type SetNodes = (updater: (prev: FlowNode[]) => FlowNode[]) => void

type Utils = {
    absOf: (n: FlowNode, all: FlowNode[]) => { x: number; y: number }
    pickDeepestBranchByTopLeft: (
        all: FlowNode[],
        abs: { x: number; y: number },
        skipId?: string
    ) => FlowNode | undefined
    isAnyBranchResizing: () => boolean
}

export class HoverBranchService {
    private hoverId: string | undefined

    // ↓ обычные поля вместо параметр-свойств
    private readonly getAll: () => FlowNode[]
    private readonly setNodes: SetNodes
    private readonly u: Utils

    constructor(getAll: () => FlowNode[], setNodes: SetNodes, utils: Utils) {
        this.getAll = getAll
        this.setNodes = setNodes
        this.u = utils
    }

    public setHoverBranch = (branchId: string | undefined): void => {
        if (this.hoverId === branchId) return
        this.hoverId = branchId

        this.setNodes((nds) =>
            nds.map((n) => {
                if (n.type !== FlowType.BranchNode) return n
                const nextData: any = n.data ? { ...(n.data as any) } : {}
                nextData.isDropTarget = branchId !== undefined && n.id === branchId
                return { ...n, data: nextData }
            })
        )
    }

    public onNodeDrag = (_e: unknown, node: FlowNode): void => {
        if (this.u.isAnyBranchResizing()) return
        const all = this.getAll()
        const abs = this.u.absOf(node, all)
        const target = this.u.pickDeepestBranchByTopLeft(all, abs, node.id)
        this.setHoverBranch(target?.id)
    }
}
