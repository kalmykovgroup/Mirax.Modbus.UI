import type {NodeOf} from "@app/scenario-designer/graph/edges/edgeRelations.tsx";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import React from "react";
import {Position} from "@xyflow/react";
import {
    positionClassMap
} from "@app/scenario-designer/components/common/ConditionExpressionTextarea/positionClassMap.ts";

export const ConditionSystem: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    system: NodeOf<FlowType.activitySystemNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};