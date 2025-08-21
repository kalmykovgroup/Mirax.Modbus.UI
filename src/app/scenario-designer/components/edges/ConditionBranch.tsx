import React, {useState} from "react";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import type {NodeOf} from "@app/scenario-designer/graph/edges/edgeRelations.tsx";
import {Position} from "@xyflow/react";
import type {BranchDto} from "@shared/contracts/Dtos/ScenarioDtos/Branches/BranchDto.ts";
import {
    ConditionExpressionTextarea
} from "@app/scenario-designer/components/common/ConditionExpressionTextarea/ConditionExpressionTextarea.tsx";


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
