import React from "react";
import {Position} from "@xyflow/react";
import {
    positionClassMap
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/positionClassMap.ts";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import type {NodeOf} from "@scenario/core/edgeMove/edgeRelations.tsx";

export const SignalSignal: React.FC<{
    source: NodeOf<FlowType.signalStepNode>;
    target: NodeOf<FlowType.signalStepNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};
