import React from "react";
import type {NodeOf} from "@app/scenario-designer/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import {FlowType} from "@app/scenario-designer/core/contracts/types/FlowType.ts";
import {
    positionClassMap
} from "@app/scenario-designer/componentsReactFlow/edges/ConditionExpressionTextarea/positionClassMap.ts";

export const ConditionDelay: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    delay: NodeOf<FlowType.delayStepNode>;
    targetPosition: Position;
}> = ({targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};