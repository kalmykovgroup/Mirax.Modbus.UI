import type {NodeOf} from "@scenario/graph/edges/edgeRelations.tsx";
import React from "react";
import {Position} from "@xyflow/react";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import {
    positionClassMap
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/positionClassMap.ts";

export const ConditionSystem: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    system: NodeOf<FlowType.activitySystemNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};