import {
    ActivityModbusNode
} from "@app/scenario-designer/componentsReactFlow/nodes/ActivityModbusNode/ActivityModbusNode.tsx";
import {
    ActivitySystemNode
} from "@app/scenario-designer/componentsReactFlow/nodes/ActivitySystemNode/ActivitySystemNode.tsx";
import {JumpStepNode} from "@app/scenario-designer/componentsReactFlow/nodes/JumpStepNode/JumpStepNode.tsx";
import {ParallelStepNode} from "@app/scenario-designer/componentsReactFlow/nodes/ParallelStepNode/ParallelStepNode.tsx";
import {BranchNode} from "@app/scenario-designer/componentsReactFlow/nodes/BranchNode/BranchNode.tsx";
import {DelayStepNode} from "@app/scenario-designer/componentsReactFlow/nodes/DelayStepNode/DelayStepNode.tsx";
import {
    ConditionStepNode
} from "@app/scenario-designer/componentsReactFlow/nodes/ConditionStepNode/ConditionStepNode.tsx";
import {SignalStepNode} from "@app/scenario-designer/componentsReactFlow/nodes/SignalStepNode/SignalStepNode.tsx";

export const nodeTypes = {
    activitySystemNode: ActivitySystemNode,
    activityModbusNode: ActivityModbusNode,
    jumpStepNode:       JumpStepNode,
    parallelStepNode:   ParallelStepNode,
    branchNode:         BranchNode,
    delayStepNode:      DelayStepNode,
    conditionStepNode:  ConditionStepNode,
    signalStepNode:  SignalStepNode,
} as const;
