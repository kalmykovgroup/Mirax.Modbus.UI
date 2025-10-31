// src/features/scenarioEditor/shared/contracts/models/FlowNode.ts

import type { Node, Edge } from '@xyflow/react';
import type { FlowType } from '@scenario/core/types/flowType';
import type { FlowNodeData } from './FlowNodeData';
import type { BaseNodeDto } from '@scenario/shared/contracts/registry/NodeTypeContract';

/**
 * FlowNode — ReactFlow нода с кастомными данными
 * TDto extends BaseNodeDto — гарантирует, что data.object всегда объект с id
 */
export interface FlowNode<TDto extends BaseNodeDto = BaseNodeDto>
    extends Node<FlowNodeData<TDto>, FlowType> {
    readonly type: FlowType;
}

/**
 * FlowEdge с кастомной data
 */
export type FlowEdgeData = Record<string, unknown> & {
    readonly __hovered?: boolean | undefined;
};

export interface FlowEdge extends Edge<FlowEdgeData> {}