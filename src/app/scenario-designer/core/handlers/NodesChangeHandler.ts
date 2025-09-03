import { applyNodeChanges, type OnNodesChange } from '@xyflow/react'
import type { FlowNode } from '@app/scenario-designer/core/contracts/models/FlowNode'

type SetNodes = (updater: (prev: FlowNode[]) => FlowNode[]) => void

export function makeOnNodesChange(
    setNodes: SetNodes,
    isAnyBranchResizing: () => boolean
): OnNodesChange<FlowNode> {
    return (changes) => {
        setNodes((nds) => {
            const next = applyNodeChanges<FlowNode>(changes, nds)
            if (isAnyBranchResizing()) {
                return next.map(n => ({ ...n, data: { ...n.data, x: n.position.x, y: n.position.y } }))
            }
            return next.map(n => ({ ...n, data: { ...n.data, x: n.position.x, y: n.position.y } }))
        })
    }
}
