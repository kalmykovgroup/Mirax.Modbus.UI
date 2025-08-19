import { JumpStepNode } from '@app/scenario-designer/components/JumpStepNode/JumpStepNode';
import { ParallelStepNode } from '@app/scenario-designer/components/ParallelStepNode/ParallelStepNode';
import { BranchNode } from '@app/scenario-designer/components/BranchNode/BranchNode';
import { DelayStepNode } from '@app/scenario-designer/components/DelayStepNode/DelayStepNode';
import { ConditionStepNode } from '@app/scenario-designer/components/ConditionStepNode/ConditionStepNode';
import { ActivitySystemNode } from '@app/scenario-designer/components/ActivitySystemNode/ActivitySystemNode';
import { ActivityModbusNode } from '@app/scenario-designer/components/ActivityModbusNode/ActivityModbusNode';
import {SignalNode} from "@app/scenario-designer/components/SignalNode/SignalNode.tsx";

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
