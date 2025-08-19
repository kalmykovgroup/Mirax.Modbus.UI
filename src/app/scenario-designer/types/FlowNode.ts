// src/app/scenario-designer/types/FlowNode.ts
import type { Node, Edge } from '@xyflow/react';
import type {StepNodeData} from "@app/scenario-designer/types/StepNodeData.ts";

export type FlowNode = Node<StepNodeData<object>>;
export type FlowEdge = Edge;
