import React from "react";
import {Position} from "@xyflow/react";
import {
    positionClassMap
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/positionClassMap.ts";
import {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {NodeOf} from "@scenario/core/edgeMove/edgeRelations.tsx";

export const SignalSignal: React.FC<{
    source: NodeOf<FlowType>;
    target: NodeOf<FlowType>;
    targetPosition: Position;
}> = ({ targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};
