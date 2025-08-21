import React from "react";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import type {NodeOf} from "@app/scenario-designer/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import {
    positionClassMap
} from "@app/scenario-designer/components/common/ConditionExpressionTextarea/positionClassMap.ts";

export const SignalSignal: React.FC<{
    source: NodeOf<FlowType.signalNode>;
    target: NodeOf<FlowType.signalNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};
