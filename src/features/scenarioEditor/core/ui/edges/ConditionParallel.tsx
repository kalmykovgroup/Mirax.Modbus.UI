import React from "react";
import {Position} from "@xyflow/react";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import {
    positionClassMap
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/positionClassMap.ts";
import type {NodeOf} from "@scenario/core/edgeMove/edgeRelations.tsx";


export const ConditionParallel: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    parallel: NodeOf<FlowType.parallelStepNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};