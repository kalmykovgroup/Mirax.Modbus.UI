// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useShiftDragMode.ts

import React, { useEffect } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { FlowNode, FlowEdge } from '@scenario/shared/contracts/models/FlowNode.ts';
import { FlowType } from '@scenario/core/types/flowType.ts';
import { useShiftKey } from '@app/lib/hooks/useShiftKey.ts';

interface UseShiftDragModeParams {
    readonly nodes: FlowNode[];
    readonly rf: ReactFlowInstance<FlowNode, FlowEdge>;
    readonly shiftDragIdsRef: React.RefObject<Set<string>>;
}

export function useShiftDragMode(params: UseShiftDragModeParams): void {
    const { nodes, rf, shiftDragIdsRef } = params;
    const isShiftPressed = useShiftKey();

    useEffect(() => {
        nodes
            .filter((n) => n.parentId && n.type !== FlowType.BranchNode)
            .forEach((n) => {
                const targetExtent = isShiftPressed ? undefined : ('parent' as const);
                const targetExpandParent = !isShiftPressed;

                if (n.extent !== targetExtent || n.expandParent !== targetExpandParent) {
                    rf.updateNode(n.id, {
                        extent: targetExtent,
                        expandParent: targetExpandParent,
                    } as FlowNode);
                }
            });
    }, [isShiftPressed, nodes, rf]);

    // Cleanup shiftDragIdsRef при unmount
    useEffect(() => {
        return () => {
            shiftDragIdsRef.current?.clear();
        };
    }, [shiftDragIdsRef]);
}