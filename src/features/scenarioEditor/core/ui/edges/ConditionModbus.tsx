import React from "react";
import type {NodeOf} from "@scenario/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import {
    positionClassMap
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/positionClassMap.ts";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";

export const ConditionModbus: React.FC<{
    condition: NodeOf<FlowType.conditionStepNode>;
    modbus: NodeOf<FlowType.activityModbusNode>;
    targetPosition: Position;
}> = ({ targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    return <div className={`${positionClassMap[targetPosition]}`}>{targetPosition}</div>;
};