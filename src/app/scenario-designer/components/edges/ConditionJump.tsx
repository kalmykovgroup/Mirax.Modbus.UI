import React from "react";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import type {NodeOf} from "@app/scenario-designer/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import {
    positionClassMap
} from "@app/scenario-designer/components/common/ConditionExpressionTextarea/positionClassMap.ts";


export const ConditionJump: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    jump: NodeOf<FlowType.jumpStepNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};
