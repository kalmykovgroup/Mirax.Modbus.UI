import type { EdgeTypes } from '@xyflow/react';
import SmartStepEdge from "@app/scenario-designer/componentsReactFlow/map/SmartStepEdge/SmartStepEdge.tsx";

export const edgeTypes: EdgeTypes = {
    step: SmartStepEdge, // подменяем стандартный
}