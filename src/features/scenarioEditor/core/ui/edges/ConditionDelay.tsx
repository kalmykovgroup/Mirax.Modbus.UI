import React from "react";
import {Position} from "@xyflow/react";
import {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import {
    positionClassMap
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/positionClassMap.ts";
import type {NodeOf} from "@scenario/core/edgeMove/edgeRelations.tsx";

export const ConditionDelay: React.FC<{
    condition: NodeOf<FlowType>;
    delay: NodeOf<FlowType>;
    targetPosition: Position;
}> = ({targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};