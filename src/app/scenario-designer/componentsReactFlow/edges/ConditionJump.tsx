import React from "react";
import type {NodeOf} from "@app/scenario-designer/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import {FlowType} from "@app/scenario-designer/core/contracts/types/FlowType.ts";
import {
    positionClassMap
} from "@app/scenario-designer/componentsReactFlow/edges/ConditionExpressionTextarea/positionClassMap.ts";


export const ConditionJump: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    jump: NodeOf<FlowType.jumpStepNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};
