// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useConnectionHandler.ts

import React, { useCallback } from 'react';
import { addEdge, type Connection, type ReactFlowInstance } from '@xyflow/react';
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import type { Guid } from '@app/lib/types/Guid';

interface UseConnectionHandlerParams {
    readonly rf: ReactFlowInstance<FlowNode, FlowEdge>;
    readonly setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
    readonly setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
    readonly operations: ReturnType<typeof import('@scenario/core/hooks/useScenarioOperations').useScenarioOperations>;
    readonly onConnectEnd: () => void;
}

export function useConnectionHandler(params: UseConnectionHandlerParams) {
    const { rf, setNodes, setEdges, operations, onConnectEnd } = params;

    const onConnect = useCallback(
        (connection: Connection): void => {
            if (connection.source == null || connection.target == null) {
                console.warn('[Connection] ⚠️ Invalid connection (null source/target)');
                onConnectEnd();
                return;
            }

            console.log('[Connection] 🔗 Creating connection:', connection);

            const relationDto = operations.createRelation(
                connection.source as Guid,
                connection.target as Guid
            );

            if (relationDto == null) {
                console.error('[Connection] ❌ Failed to create relation');
                onConnectEnd();
                return;
            }

            setEdges((eds) =>
                addEdge(
                    {
                        ...connection,
                        id: relationDto.id,
                        type: 'step',
                        data: { relationDto }, // Добавляем relationDto для возможности редактирования
                    },
                    eds
                )
            );

            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === connection.source && n.data.object) {
                        const dto = n.data.object as any;
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                object: {
                                    ...dto,
                                    childRelations: [...(dto.childRelations ?? []), relationDto],
                                },
                            },
                        };
                    }
                    if (n.id === connection.target && n.data.object) {
                        const dto = n.data.object as any;
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                object: {
                                    ...dto,
                                    parentRelations: [...(dto.parentRelations ?? []), relationDto],
                                },
                            },
                        };
                    }
                    return n;
                })
            );

            console.log('[Connection] ✅ Connection established', {
                source: connection.source,
                target: connection.target,
                relationId: relationDto.id,
            });
        },
        [rf, setNodes, setEdges, operations, onConnectEnd]
    );

    return { onConnect };
}