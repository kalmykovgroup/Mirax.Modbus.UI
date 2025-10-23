// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useShiftDragMode.ts

import React, { useEffect } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { FlowNode, FlowEdge } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import { useShiftKey } from '@app/lib/hooks/useShiftKey';

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