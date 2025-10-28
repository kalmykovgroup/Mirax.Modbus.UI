import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";

import styles from "./ConditionStepNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import type {
    ConditionStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { useValidationIndicator } from '@scenario/core/ui/nodes/shared/ValidationIndicator';

type Props = NodeProps<Node<FlowNodeData<ConditionStepDto>>>;
export function ConditionStepNode({ id, data, selected}: Props) {

    const handleType = data?.connectContext?.from.handleType;

    const { ValidationIndicator, containerClassName } = useValidationIndicator(id);

    return (
        <div className={`${styles.container} ${containerClassName}`} aria-selected={selected}>
            {ValidationIndicator}
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <span className={styles.name}>Условие</span>
            <span className={styles.text}><span className={styles.textIf}>If </span>value</span>

            <Handle
                className={`${styles.target}`} aria-selected={handleType === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source} ${styles.sourceTop}`} aria-selected={handleType === 'target'}
                key="s1"
                id="s1"
                type="source"
                position={Position.Right}
            />

            <Handle
                className={`${styles.source}`} aria-selected={handleType === 'target'}
                key="s2"
                id="s2"
                type="source"
                position={Position.Right}
            />

            <Handle
                className={`${styles.source} ${styles.sourceBottom}`} aria-selected={handleType === 'target'}
                key="s3"
                id="s3"
                type="source"
                position={Position.Right}
            />

        </div>
    );
}

