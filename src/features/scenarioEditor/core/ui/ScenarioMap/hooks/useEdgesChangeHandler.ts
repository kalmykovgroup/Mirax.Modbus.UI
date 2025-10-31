// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useEdgesChangeHandler.ts

import React, { useCallback } from 'react';
import { applyEdgeChanges, type OnEdgesChange } from '@xyflow/react';
import type { FlowEdge } from '@scenario/shared/contracts/models/FlowNode.ts';

interface UseEdgesChangeHandlerParams {
    readonly setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
    readonly operations: ReturnType<typeof import('@scenario/core/hooks/useScenarioOperations.ts').useScenarioOperations>;
}

export function useEdgesChangeHandler(params: UseEdgesChangeHandlerParams): OnEdgesChange<FlowEdge> {
    const { setEdges, operations } = params;

    return useCallback((changes) => {
        // Закомментировано избыточное логирование (срабатывает при каждом hover)
        // console.log('[EdgesChange]', changes);

        setEdges((eds) => applyEdgeChanges(changes, eds) as FlowEdge[]);

        for (const change of changes) {
            if (change.type === 'select') {
                // console.log(
                //     `[EdgesChange] 🎯 EDGE ${change.selected ? 'SELECTED' : 'DESELECTED'} | ID: ${change.id}`
                // );
            }

            if (change.type === 'remove') {
                console.log(`[EdgesChange] 🗑️ EDGE REMOVED | ID: ${change.id}`);
                operations.deleteRelation(change.id);
            }
        }
    }, [setEdges, operations]);
}