import type { EdgeTypes } from '@xyflow/react';
import SmartStepEdge from "@scenario/core/ui/map/SmartStepEdge/SmartStepEdge.tsx";

export const edgeTypes: EdgeTypes = {
    step: SmartStepEdge, // подменяем стандартный
}