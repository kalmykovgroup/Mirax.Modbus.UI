import React, {useState} from "react";
import type {NodeOf} from "@app/scenario-designer/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import type {BranchDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/BranchDto.ts";
import {
    ConditionExpressionTextarea
} from "@app/scenario-designer/componentsReactFlow/edges/ConditionExpressionTextarea/ConditionExpressionTextarea.tsx";
import {FlowType} from "@app/scenario-designer/core/contracts/types/FlowType.ts";

export const ConditionBranch: React.FC<{
    branch: NodeOf<FlowType.branchNode>;
    condition: NodeOf<FlowType.conditionStepNode>;
    targetPosition: Position;
}> = ({branch, targetPosition }) => {
    // тут доступны ВСЕ поля обоих объектов

    const branchObj = branch.data.object as BranchDto | undefined;

    const [conditionExpression, setConditionExpression] = useState<string>(branchObj?.conditionExpression ?? ""); // Declare a state variable...

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
