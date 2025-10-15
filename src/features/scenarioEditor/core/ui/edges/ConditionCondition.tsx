import React, {useState} from "react";
import {Position} from "@xyflow/react";

import type {ConditionStepDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import type {StepRelationDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/StepRelations/StepRelationDto.ts";
import {
    ConditionExpressionTextarea
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/ConditionExpressionTextarea.tsx";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import type {NodeOf} from "@scenario/core/edgeMove/edgeRelations.tsx";

export const ConditionCondition: React.FC<{
    source: NodeOf<FlowType.conditionStepNode>;
    target: NodeOf<FlowType.conditionStepNode>;
    targetPosition: Position;
}> = ({source, target, targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    const conditionStepDto = target.data.object as ConditionStepDto | undefined;
    const parentRelation: StepRelationDto | undefined = conditionStepDto?.parentRelations.find(rel => rel.parentStepId == source.id);


    const [conditionExpression, setConditionExpression] = useState<string>(parentRelation?.conditionExpression ?? "");

    const onChange = (conditionExpression: string) => {
        setConditionExpression(conditionExpression);

    }

    return <>

        <ConditionExpressionTextarea
            conditionExpression={conditionExpression}
            onChange={onChange}
            targetPosition={targetPosition}
        />
    </>;
};