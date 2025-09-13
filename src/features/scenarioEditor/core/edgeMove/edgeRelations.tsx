import React from 'react';
import type {Position} from "@xyflow/react";
import {ConditionBranch} from "@scenario/core/ui/edges/ConditionBranch.tsx";
import {ConditionCondition} from "@scenario/core/ui/edges/ConditionCondition.tsx";
import {ConditionJump} from "@scenario/core/ui/edges/ConditionJump.tsx";
import {ConditionDelay} from "@scenario/core/ui/edges/ConditionDelay.tsx";
import {ConditionParallel} from "@scenario/core/ui/edges/ConditionParallel.tsx";
import {ConditionSystem} from "@scenario/core/ui/edges/ConditionSystem.tsx";
import {ConditionModbus} from "@scenario/core/ui/edges/ConditionModbus.tsx";
import {SignalSignal} from "@scenario/core/ui/edges/SignalSignal.tsx";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import type {FlowNode} from "@/features/scenarioEditor/shared/contracts/models/FlowNode.ts";

/** Сужение FlowNode до конкретного типа enum */
export type NodeOf<T extends FlowType> = FlowNode & { type: T };

/** type guard */
function isNodeType<T extends FlowType>(n: FlowNode | undefined, t: T): n is NodeOf<T> {
    return !!n && n.type === t;
}
/**
 * Возвращает ТВОЙ пустой компонент для найденной пары типов.
 * Порядок учитывается, но пары поддерживаются в обе стороны (src↔tgt).
 */
export function resolveEdgeRender(
    src: FlowNode,
    tgt: FlowNode,
    targetPosition: Position
): React.ReactElement | null {

    // Condition -> Branch (или Branch <- Condition)
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.branchNode))
        return <ConditionBranch condition={src} branch={tgt} targetPosition={targetPosition} />;

    if (isNodeType(src, FlowType.branchNode) && isNodeType(tgt, FlowType.conditionStepNode))
        return <ConditionBranch condition={tgt} branch={src} targetPosition={targetPosition} />;

    // Condition -> Condition
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.conditionStepNode))
        return <ConditionCondition source={src} target={tgt} targetPosition={targetPosition} />;


    // Condition -> Jump (обе стороны)
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.jumpStepNode))
        return <ConditionJump condition={src} jump={tgt} targetPosition={targetPosition} />;

    if (isNodeType(src, FlowType.jumpStepNode) && isNodeType(tgt, FlowType.conditionStepNode))
        return <ConditionJump condition={tgt} jump={src} targetPosition={targetPosition} />;


    // Condition -> Delay
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.delayStepNode))
        return <ConditionDelay condition={src} delay={tgt} targetPosition={targetPosition} />;

    if (isNodeType(src, FlowType.delayStepNode) && isNodeType(tgt, FlowType.conditionStepNode))
        return <ConditionDelay condition={tgt} delay={src} targetPosition={targetPosition} />;


    // Condition -> Parallel
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.parallelStepNode))
        return <ConditionParallel condition={src} parallel={tgt} targetPosition={targetPosition} />;

    if (isNodeType(src, FlowType.parallelStepNode) && isNodeType(tgt, FlowType.conditionStepNode))
        return <ConditionParallel condition={tgt} parallel={src} targetPosition={targetPosition} />;


    // Condition -> System
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.activitySystemNode))
        return <ConditionSystem condition={src} system={tgt} targetPosition={targetPosition} />;

    if (isNodeType(src, FlowType.activitySystemNode) && isNodeType(tgt, FlowType.conditionStepNode))
        return <ConditionSystem condition={tgt} system={src} targetPosition={targetPosition} />;


    // Condition -> Modbus
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.activityModbusNode))
        return <ConditionModbus condition={src} modbus={tgt} targetPosition={targetPosition} />;

    if (isNodeType(src, FlowType.activityModbusNode) && isNodeType(tgt, FlowType.conditionStepNode))
        return <ConditionModbus condition={tgt} modbus={src} targetPosition={targetPosition} />;


    // Signal -> Signal
    if (isNodeType(src, FlowType.signalStepNode) && isNodeType(tgt, FlowType.signalStepNode))
        return <SignalSignal source={src} target={tgt} targetPosition={targetPosition} />;

    // Неизвестная пара — ничего не выводим
    return null;
}
