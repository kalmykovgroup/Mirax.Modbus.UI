import React from 'react';
import type { FlowNode } from '@app/scenario-designer/types/FlowNode.ts';
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import {ConditionDelay} from "@app/scenario-designer/components/edges/ConditionDelay.tsx";
import {ConditionParallel} from "@app/scenario-designer/components/edges/ConditionParallel.tsx";
import {ConditionSystem} from "@app/scenario-designer/components/edges/ConditionSystem.tsx";
import {ConditionModbus} from "@app/scenario-designer/components/edges/ConditionModbus.tsx";
import {SignalSignal} from "@app/scenario-designer/components/edges/SignalSignal.tsx";
import {ConditionCondition} from "@app/scenario-designer/components/edges/ConditionCondition.tsx";
import {ConditionJump} from "@app/scenario-designer/components/edges/ConditionJump.tsx";
import {ConditionBranch} from "@app/scenario-designer/components/edges/ConditionBranch.tsx";
import type {Position} from "@xyflow/react";

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
    if (isNodeType(src, FlowType.signalNode) && isNodeType(tgt, FlowType.signalNode))
        return <SignalSignal source={src} target={tgt} targetPosition={targetPosition} />;

    // Неизвестная пара — ничего не выводим
    return null;
}
