
import type { Node, Edge } from '@xyflow/react';
import type {StepNodeData} from "@app/scenario-designer/core/contracts/models/StepNodeData.ts";

export type FlowNode = Node<StepNodeData<object>>;
export type FlowEdge = Edge;
