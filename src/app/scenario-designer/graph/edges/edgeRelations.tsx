import React from 'react';
import type { FlowNode } from '@app/scenario-designer/types/FlowNode.ts';
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";

/** Сужение FlowNode до конкретного типа enum */
export type NodeOf<T extends FlowType> = FlowNode & { type: T };

/** type guard */
function isNodeType<T extends FlowType>(n: FlowNode | undefined, t: T): n is NodeOf<T> {
    return !!n && n.type === t;
}

/* =========================
 * ПУСТЫЕ КОМПОНЕНТЫ ДЛЯ ПАР
 * (верни JSX внутри — и всё)
 * ========================= */

export const BranchCondition: React.FC<{
    branch: NodeOf<FlowType.branchNode>;
    condition: NodeOf<FlowType.conditionStepNode>;
}> = ({ branch, condition }) => {
    // тут доступны ВСЕ поля обоих объектов
    console.log(branch);
    console.log(condition);


    return <div className="my-edge-chip">test</div>;
};

export const ConditionCondition: React.FC<{
    source: NodeOf<FlowType.conditionStepNode>;
    target: NodeOf<FlowType.conditionStepNode>;
}> = (_props) => null;

export const ConditionJump: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    jump: NodeOf<FlowType.jumpStepNode>;
}> = (_props) => null;

export const ConditionDelay: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    delay: NodeOf<FlowType.delayStepNode>;
}> = (_props) => null;

export const ConditionParallel: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    parallel: NodeOf<FlowType.parallelStepNode>;
}> = (_props) => null;

export const ConditionSystem: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    system: NodeOf<FlowType.activitySystemNode>;
}> = (_props) => null;

export const ConditionModbus: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    modbus: NodeOf<FlowType.activityModbusNode>;
}> = (_props) => null;

export const SignalSignal: React.FC<{
    source: NodeOf<FlowType.signalNode>;
    target: NodeOf<FlowType.signalNode>;
}> = (_props) => null;

/* =========================
 * РЕЗОЛВЕР ПАРЫ
 * ========================= */

/**
 * Возвращает ТВОЙ пустой компонент для найденной пары типов.
 * Порядок учитывается, но пары поддерживаются в обе стороны (src↔tgt).
 */
export function resolveEdgeRender(
    src?: FlowNode,
    tgt?: FlowNode
): React.ReactElement | null {
    if (!src || !tgt) return null;

    // Condition -> Branch (или Branch <- Condition)
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.branchNode)) {
        return <BranchCondition condition={src} branch={tgt} />;
    }
    if (isNodeType(src, FlowType.branchNode) && isNodeType(tgt, FlowType.conditionStepNode)) {
        return <BranchCondition condition={tgt} branch={src} />;
    }

    // Condition -> Condition
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.conditionStepNode)) {
        return <ConditionCondition source={src} target={tgt} />;
    }

    // Condition -> Jump (обе стороны)
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.jumpStepNode)) {
        return <ConditionJump condition={src} jump={tgt} />;
    }
    if (isNodeType(src, FlowType.jumpStepNode) && isNodeType(tgt, FlowType.conditionStepNode)) {
        return <ConditionJump condition={tgt} jump={src} />;
    }

    // Condition -> Delay
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.delayStepNode)) {
        return <ConditionDelay condition={src} delay={tgt} />;
    }
    if (isNodeType(src, FlowType.delayStepNode) && isNodeType(tgt, FlowType.conditionStepNode)) {
        return <ConditionDelay condition={tgt} delay={src} />;
    }

    // Condition -> Parallel
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.parallelStepNode)) {
        return <ConditionParallel condition={src} parallel={tgt} />;
    }
    if (isNodeType(src, FlowType.parallelStepNode) && isNodeType(tgt, FlowType.conditionStepNode)) {
        return <ConditionParallel condition={tgt} parallel={src} />;
    }

    // Condition -> System
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.activitySystemNode)) {
        return <ConditionSystem condition={src} system={tgt} />;
    }
    if (isNodeType(src, FlowType.activitySystemNode) && isNodeType(tgt, FlowType.conditionStepNode)) {
        return <ConditionSystem condition={tgt} system={src} />;
    }

    // Condition -> Modbus
    if (isNodeType(src, FlowType.conditionStepNode) && isNodeType(tgt, FlowType.activityModbusNode)) {
        return <ConditionModbus condition={src} modbus={tgt} />;
    }
    if (isNodeType(src, FlowType.activityModbusNode) && isNodeType(tgt, FlowType.conditionStepNode)) {
        return <ConditionModbus condition={tgt} modbus={src} />;
    }

    // Signal -> Signal
    if (isNodeType(src, FlowType.signalNode) && isNodeType(tgt, FlowType.signalNode)) {
        return <SignalSignal source={src} target={tgt} />;
    }

    // Неизвестная пара — ничего не выводим
    return null;
}
