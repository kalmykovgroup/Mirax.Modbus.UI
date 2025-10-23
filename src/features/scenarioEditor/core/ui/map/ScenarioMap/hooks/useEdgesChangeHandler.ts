// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useEdgesChangeHandler.ts

import React, { useCallback } from 'react';
import { applyEdgeChanges, type OnEdgesChange } from '@xyflow/react';
import type { FlowEdge } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';

interface UseEdgesChangeHandlerParams {
    readonly setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
}

export function useEdgesChangeHandler(params: UseEdgesChangeHandlerParams): OnEdgesChange<FlowEdge> {
    const { setEdges } = params;

    return useCallback((changes) => {
        console.log('[EdgesChange]', changes);
        setEdges((eds) => applyEdgeChanges(changes, eds) as FlowEdge[]);

        for (const change of changes) {
            if (change.type === 'select') {
                console.log(
                    `[EdgesChange] 🎯 EDGE ${change.selected ? 'SELECTED' : 'DESELECTED'} | ID: ${change.id}`
                );
            }

            if (change.type === 'remove') {
                console.log(`[EdgesChange] 🗑️ EDGE REMOVED | ID: ${change.id}`);
            }
        }
    }, [setEdges]);
}