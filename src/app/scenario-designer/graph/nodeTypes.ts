import {ActivitySystemNode} from "@app/scenario-designer/components/nodes/ActivitySystemNode/ActivitySystemNode.tsx";
import {ActivityModbusNode} from "@app/scenario-designer/components/nodes/ActivityModbusNode/ActivityModbusNode.tsx";
import {JumpStepNode} from "@app/scenario-designer/components/nodes/JumpStepNode/JumpStepNode.tsx";
import {ParallelStepNode} from "@app/scenario-designer/components/nodes/ParallelStepNode/ParallelStepNode.tsx";
import {BranchNode} from "@app/scenario-designer/components/nodes/BranchNode/BranchNode.tsx";
import {DelayStepNode} from "@app/scenario-designer/components/nodes/DelayStepNode/DelayStepNode.tsx";
import {ConditionStepNode} from "@app/scenario-designer/components/nodes/ConditionStepNode/ConditionStepNode.tsx";
import {SignalNode} from "@app/scenario-designer/components/nodes/SignalNode/SignalNode.tsx";


export const nodeTypes = {
    activitySystemNode: ActivitySystemNode,
    activityModbusNode: ActivityModbusNode,
    jumpStepNode:       JumpStepNode,
    parallelStepNode:   ParallelStepNode,
    branchNode:         BranchNode,
    delayStepNode:      DelayStepNode,
    conditionStepNode:  ConditionStepNode,
    signalNode:  SignalNode,
} as const;
