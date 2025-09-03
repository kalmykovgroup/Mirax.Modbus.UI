import React from "react";
import type {NodeOf} from "@app/scenario-designer/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import {
    positionClassMap
} from "@app/scenario-designer/componentsReactFlow/edges/ConditionExpressionTextarea/positionClassMap.ts";
import {FlowType} from "@app/scenario-designer/core/contracts/types/FlowType.ts";

export const SignalSignal: React.FC<{
    source: NodeOf<FlowType.signalStepNode>;
    target: NodeOf<FlowType.signalStepNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};
