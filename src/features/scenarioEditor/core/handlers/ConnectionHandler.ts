import { addEdge, type Connection } from '@xyflow/react'
import type { FlowEdge } from '@/features/scenarioEditor/shared/contracts/models/FlowNode'

type SetEdges = (updater: (prev: FlowEdge[]) => FlowEdge[]) => void

export class ConnectionHandler {
    private readonly setEdges: SetEdges
    private readonly onConnectEnd: () => void

    constructor(setEdges: SetEdges, onConnectEnd: () => void) {
        this.setEdges = setEdges
        this.onConnectEnd = onConnectEnd
    }

    public onConnect = (conn: Connection): void => {
        this.setEdges(eds => addEdge({ ...conn, type: 'step' }, eds))
        this.onConnectEnd()
    }
}
