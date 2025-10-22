// src/features/scenarioEditor/nodes/index.ts

import { nodeTypeRegistry } from "@scenario/shared/contracts/registry/NodeTypeRegistry";
import { DelayStepNodeContract } from "@scenario/core/ui/nodes/DelayStepNode/DelayStepNodeContract";
import { JumpStepNodeContract } from "@scenario/core/ui/nodes/JumpStepNode/JumpStepNodeContract";
import { ParallelStepNodeContract } from "@scenario/core/ui/nodes/ParallelStepNode/ParallelStepNodeContract";
import { BranchNodeContract } from "@scenario/core/ui/nodes/BranchNode/BranchNodeContract";
import { ConditionStepNodeContract } from "@scenario/core/ui/nodes/ConditionStepNode/ConditionStepNodeContract";
import { ActivitySystemNodeContract } from "@scenario/core/ui/nodes/ActivitySystemNode/ActivitySystemNodeContract";
import { ActivityModbusNodeContract } from "@scenario/core/ui/nodes/ActivityModbusNode/ActivityModbusNodeContract";
import { SignalStepNodeContract } from "@scenario/core/ui/nodes/SignalStepNode/SignalStepNodeContract";
import {relationRegistry} from "@scenario/core/ui/edges/RelationRegistry.ts";
import {stepRelationContract} from "@scenario/core/ui/edges/StepRelationContract.ts";

export function registerAllNodeTypes(): void {
    nodeTypeRegistry.register(BranchNodeContract);
    nodeTypeRegistry.register(DelayStepNodeContract);
    nodeTypeRegistry.register(JumpStepNodeContract);
    nodeTypeRegistry.register(ParallelStepNodeContract);
    nodeTypeRegistry.register(ConditionStepNodeContract);
    nodeTypeRegistry.register(ActivitySystemNodeContract);
    nodeTypeRegistry.register(ActivityModbusNodeContract);
    nodeTypeRegistry.register(SignalStepNodeContract);

    // ✅ Регистрация связей
    relationRegistry.register(stepRelationContract);
}