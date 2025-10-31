import React, {useState} from "react";
import {Position} from "@xyflow/react";
import type {BranchDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto.ts";
import {
    ConditionExpressionTextarea
} from "@scenario/core/ui/edges/ConditionExpressionTextarea/ConditionExpressionTextarea.tsx";
import type {NodeOf} from "@scenario/core/edgeMove/edgeRelations.tsx";
import { FlowType } from '@scenario/core/types/flowType.ts';

export const ConditionBranch: React.FC<{
    branch: NodeOf<FlowType>;
    condition: NodeOf<FlowType>;
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
