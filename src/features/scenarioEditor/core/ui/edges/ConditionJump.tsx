import React from "react";
import type {NodeOf} from "@scenario/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import {
    positionClassMap
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/positionClassMap.ts";


export const ConditionJump: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    jump: NodeOf<FlowType.jumpStepNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};
