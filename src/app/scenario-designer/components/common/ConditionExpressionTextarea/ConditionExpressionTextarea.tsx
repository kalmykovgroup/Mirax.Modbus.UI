import React from "react";
import { Position } from "@xyflow/react";
import edgeCondition from "./edgeCondition.module.css";
import {
    positionClassMap
} from "@app/scenario-designer/components/common/ConditionExpressionTextarea/positionClassMap.ts";

export const ConditionExpressionTextarea: React.FC<{
    conditionExpression: string;
    onChange: (conditionExpression: string) => void;
    targetPosition: Position;
}> = ({ conditionExpression, onChange, targetPosition }) => {

    return (
        <div className={`${positionClassMap[targetPosition]}`}>
            <div className={edgeCondition.inputContainer}>
                <div className={`${edgeCondition.form__group} ${edgeCondition.field}`}>
          <textarea
              value={conditionExpression}
              onChange={(e) => onChange(e.target.value)}
              className={edgeCondition.form__field}
              placeholder="conditionExpression"
          />
                    <label htmlFor="name" className={edgeCondition.form__label}>
                        Если
                    </label>
                </div>
            </div>
        </div>
    );
};
