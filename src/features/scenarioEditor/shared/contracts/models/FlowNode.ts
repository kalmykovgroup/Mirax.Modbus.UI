
import type { Node, Edge } from '@xyflow/react';
import type {StepNodeData} from "@/features/scenarioEditor/shared/contracts/models/StepNodeData.ts";

export type FlowNode = Node<StepNodeData<object>>;
export type FlowEdge = Edge;
