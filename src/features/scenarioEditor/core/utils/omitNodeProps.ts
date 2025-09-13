import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode'

export function omitNodeProps<T extends FlowNode>(
    n: T,
    keys: Array<keyof FlowNode>
): FlowNode {
    const clone: any = { ...n }
    for (const k of keys) delete clone[k]
    return clone as FlowNode
}
