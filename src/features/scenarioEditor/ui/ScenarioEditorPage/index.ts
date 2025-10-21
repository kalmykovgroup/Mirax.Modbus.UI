// src/features/scenarioEditor/nodes/index.ts

import {nodeTypeRegistry} from "@scenario/shared/contracts/registry/NodeTypeRegistry.ts";
import {DelayStepNodeContract} from "@scenario/core/ui/nodes/DelayStepNode/DelayStepNodeContract.ts";
import {JumpStepNodeContract} from "@scenario/core/ui/nodes/JumpStepNode/JumpStepNodeContract.ts";
import {ParallelStepNodeContract} from "@scenario/core/ui/nodes/ParallelStepNode/ParallelStepNodeContract.ts";
import {BranchNodeContract} from "@scenario/core/ui/nodes/BranchNode/BranchNodeContract.ts";
import {ConditionStepNodeContract} from "@scenario/core/ui/nodes/ConditionStepNode/ConditionStepNodeContract.ts";
import {ActivitySystemNodeContract} from "@scenario/core/ui/nodes/ActivitySystemNode/ActivitySystemNodeContract.ts";
import {ActivityModbusNodeContract} from "@scenario/core/ui/nodes/ActivityModbusNode/ActivityModbusNodeContract.ts";
import {SignalStepNodeContract} from "@scenario/core/ui/nodes/SignalStepNode/SignalStepNodeContract.ts";


// Импортируем все обработчики для регистрации
import '@scenario/core/ui/nodes/DelayStepNode/commands';
import '@scenario/core/ui/nodes/BranchNode/commands';
import '@scenario/core/ui/nodes/JumpStepNode/commands';
import '@scenario/core/ui/nodes/SignalStepNode/commands';
import '@scenario/core/ui/nodes/ParallelStepNode/commands';
import '@scenario/core/ui/nodes/ConditionStepNode/commands';
import '@scenario/core/ui/nodes/ActivitySystemNode/commands';
import '@scenario/core/ui/nodes/ActivityModbusNode/commands';

import '@scenario/core/features/scenarioChangeCenter/scenarioCommands';

// Этот файл просто импортирует все обработчики для их регистрации
console.log('[CommandRegistry] All command handlers registered');

/**
 * Регистрирует все типы нод в глобальном реестре.
 * Должна быть вызвана один раз при старте приложения (в main.tsx).
 */


export function registerAllNodeTypes(): void {
    nodeTypeRegistry.register(BranchNodeContract);
    nodeTypeRegistry.register(DelayStepNodeContract);
    nodeTypeRegistry.register(JumpStepNodeContract);
    nodeTypeRegistry.register(ParallelStepNodeContract);
    nodeTypeRegistry.register(ConditionStepNodeContract);
    nodeTypeRegistry.register(ActivitySystemNodeContract);
    nodeTypeRegistry.register(ActivityModbusNodeContract);
    nodeTypeRegistry.register(SignalStepNodeContract);
}

