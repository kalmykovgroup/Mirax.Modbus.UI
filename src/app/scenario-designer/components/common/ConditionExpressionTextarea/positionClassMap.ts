import {Position} from "@xyflow/react";
import edgeCondition from "./edgeCondition.module.css";

export const positionClassMap: Record<Position, string> = {
    [Position.Top]: `${edgeCondition.topTargetPosition} ${edgeCondition.box}`,
    [Position.Bottom]: `${edgeCondition.bottomTargetPosition} ${edgeCondition.box}`,
    [Position.Left]: `${edgeCondition.leftTargetPosition} ${edgeCondition.box}`,
    [Position.Right]: `${edgeCondition.rightTargetPosition} ${edgeCondition.box}`,
};
