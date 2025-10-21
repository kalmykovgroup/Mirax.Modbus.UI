// src/features/scenarioEditor/shared/contracts/models/FlowNode.ts
import type { Node, Edge } from '@xyflow/react';
import type { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { FlowNodeData } from './FlowNodeData';

/**
 * Наш FlowNode — это обычная ReactFlow нода с кастомными данными
 */
export interface FlowNode<TDto = unknown> extends Node<FlowNodeData<TDto>, FlowType> {
    readonly type: FlowType;
}

/**
 * FlowEdge с кастомной data
 */
export type FlowEdgeData = Record<string, unknown> & {
    readonly __hovered?: boolean | undefined;
};

export interface FlowEdge extends Edge<FlowEdgeData> {}