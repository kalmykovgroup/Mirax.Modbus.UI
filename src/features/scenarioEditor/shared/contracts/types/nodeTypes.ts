import {
    ActivityModbusNode
} from "@scenario/core/ui/nodes/ActivityModbusNode/ActivityModbusNode.tsx";
import {
    ActivitySystemNode
} from "@scenario/core/ui/nodes/ActivitySystemNode/ActivitySystemNode.tsx";
import {JumpStepNode} from "@scenario/core/ui/nodes/JumpStepNode/JumpStepNode.tsx";
import {ParallelStepNode} from "@scenario/core/ui/nodes/ParallelStepNode/ParallelStepNode.tsx";
import {BranchNode} from "@scenario/core/ui/nodes/BranchNode/BranchNode.tsx";
import {DelayStepNode} from "@scenario/core/ui/nodes/DelayStepNode/DelayStepNode.tsx";
import {
    ConditionStepNode
} from "@scenario/core/ui/nodes/ConditionStepNode/ConditionStepNode.tsx";
import {SignalStepNode} from "@scenario/core/ui/nodes/SignalStepNode/SignalStepNode.tsx";

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
