import { useEffect, useMemo, useRef } from 'react'
import type { IsValidConnection } from '@xyflow/react'
import type { FlowEdge } from '@/features/scenarioEditor/shared/contracts/models/FlowNode'

export function useEdgesRef(edges: FlowEdge[]) {
    const ref = useRef<FlowEdge[]>([])
    useEffect(() => { ref.current = edges }, [edges])
    return ref
}

export function useIsValidConnection<T extends FlowEdge>(
    getNodeType: (id: string) => string | undefined,
    getEdges: () => T[],
    createIsValidConnection: (args: any) => IsValidConnection<T>,
    allowMap: any,
    targetAllowMap: any
): IsValidConnection<T> {
    return useMemo(
        () => createIsValidConnection({ getNodeType, getEdges, allowMap, targetAllowMap }),
        [getNodeType, getEdges, allowMap, targetAllowMap]
    )
}
