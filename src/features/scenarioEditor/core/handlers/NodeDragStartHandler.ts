// @scenario/core/handlers/NodeDragStartHandler.ts
import type React from 'react';
import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode.ts';

export type NodeDragStartDeps = {
    shiftDragIdsRef: React.MutableRefObject<Set<string>>;
};

export class NodeDragStartHandler {
    private readonly shiftDragIdsRef: React.MutableRefObject<Set<string>>;

    constructor(deps: NodeDragStartDeps) {
        this.shiftDragIdsRef = deps.shiftDragIdsRef;
    }

    onNodeDragStart = (e: React.MouseEvent | React.TouchEvent, node: FlowNode): void => {
        // Проверяем нажатие Shift при начале драга
        const isShiftPressed = 'shiftKey' in e ? e.shiftKey : false;

        if (isShiftPressed) {
            this.shiftDragIdsRef.current.add(node.id);
            console.log(`[NodeDragStartHandler] 🔀 SHIFT + DRAG START | Node: ${node.id}`);
        } else {
            // Убеждаемся, что нода не в списке Shift-drag
            this.shiftDragIdsRef.current.delete(node.id);
        }
    };
}