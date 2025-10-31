// src/features/scenarioEditor/core/ui/map/ScenarioMap/config/flowConfig.ts

import { ConnectionLineType, MarkerType, SelectionMode } from '@xyflow/react';
import { edgeTypes } from '@scenario/core/types/edgeTypes.ts';

// ❌ УДАЛИТЬ: export const nodeTypes = generateNodeTypes();
// ✅ Экспортируем только функцию, вызов будет в компоненте
export { generateNodeTypes } from '@scenario/core/utils/generateNodeTypes.ts';

export { edgeTypes };

export const defaultEdgeOptions = {
    animated: true,
    type: 'step',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
        stroke: 'var(--edge-default-color, #ffffff)',
        strokeWidth: 'var(--edge-width, 1.5)',
        opacity: 1,
    },
} as const;

export const flowSettings = {
    connectionLineType: ConnectionLineType.Step,
    selectionOnDrag: true,
    selectionMode: SelectionMode.Partial,
    panOnDrag: [1, 2] as [number, number],
    panOnScroll: false,
    zoomOnScroll: true,
    zoomActivationKeyCode: ['Control', 'Meta'] as string[],
    autoPanSpeed: 3,
    minZoom: 0.01,
    maxZoom: 10,
    fitView: true,
} as const;