import React, { useCallback, useEffect, useState } from 'react';
import type { OnConnectStartParams } from '@xyflow/react';
import type {
    ConnectFrom,
    ConnectContext,
    FlowNode,
    FlowType,
} from '@app/scenario-designer/types/FlowNode.ts';

/** Минимальный API, который нам нужен от React Flow instance */
type RfLike = {
    getNodes: () => FlowNode[];
};

type Params = {
    rf: RfLike;                                                   // доступ к актуальным нодам из стора RF
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;   // обновление nodes
};

/**
 * Ведём «контекст соединения» и оповещаем ноды через node.data:
 *  - connectFrom: 'source' | 'target' | null
 *  - connectFromType: FlowType | undefined
 *  - isConnecting: boolean
 */
export function useConnectContext({ rf, setNodes }: Params) {
    const [connectCtx, setConnectCtx] = useState<ConnectContext | null>(null);

    /** Тип ноды по id из актуального стора RF */
    const getNodeType = useCallback((id?: string | null): FlowType | undefined => {
        if (!id) return;
        const node = rf.getNodes().find((n) => n.id === id);
        return node?.type as FlowType | undefined;
    }, [rf]);

    /** Начало протягивания ребра */
    const onConnectStart = useCallback((
        _evt: MouseEvent | TouchEvent,
        params: OnConnectStartParams
    ) => {
        const fromType = getNodeType(params.nodeId);

        if (!params.handleType || !params.nodeId || !fromType) {
            setConnectCtx(null);
            return;
        }

        setConnectCtx({
            from: {
                nodeId: params.nodeId,
                type: fromType,
                handleType: params.handleType,      // 'source' | 'target'
                handleId: params.handleId ?? null,
            },
        });
    }, [getNodeType]);

    /** Сброс контекста — бросили «в никуда» или завершили соединение */
    const onConnectEnd = useCallback(() => setConnectCtx(null), []);

    /** Широковещание статуса в node.data (визуальные подсказки нодам) */
    useEffect(() => {
        const connectFrom: ConnectFrom = connectCtx?.from.handleType ?? null;
        const connectFromType = connectCtx?.from.type;
        const isConnecting = !!connectCtx;

        setNodes((nds) =>
            nds.map((n) => ({
                ...n,
                data: { ...n.data, connectFrom, connectFromType, isConnecting },
            }))
        );
    }, [connectCtx, setNodes]);

    return {
        connectCtx,
        onConnectStart,
        onConnectEnd,
        getNodeType,
    };
}
