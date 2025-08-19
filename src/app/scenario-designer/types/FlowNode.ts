// src/app/scenario-designer/types/flowTypes.ts
import type { Node, Edge } from '@xyflow/react';

// @ts-ignore
export enum FlowType {
    jumpStepNode = 'jumpStepNode',
    delayStepNode = 'delayStepNode',
    parallelStepNode = 'parallelStepNode',
    branchNode = 'branchNode',
    conditionStepNode = 'conditionStepNode',
    activitySystemNode = 'activitySystemNode',
    activityModbusNode = 'activityModbusNode',
    signalNode = 'signalNode',
}

export type ConnectFrom = 'source' | 'target' | null;

// только данные, лежащие в node.data (без hover/over)
export type StepNodeData = {
    connectFrom: ConnectFrom;        // откуда тянем: source/target/null
    connectFromType?: FlowType;      // тип узла-источника
    isConnecting?: boolean;          // сейчас идёт «drag connection»
    x?: number;
    y?: number;
};

// контекст «драг-соединения» — ТОЛЬКО старт
export type ConnectContext = {
    from: {
        nodeId: string;
        type: FlowType;
        handleType: Exclude<ConnectFrom, null>;
        handleId?: string | null;
    };
};

export type FlowNode = Node<StepNodeData>;
export type FlowEdge = Edge;
