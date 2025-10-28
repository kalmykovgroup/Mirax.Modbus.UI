import styles from "./ParallelStepNode.module.css";
import {type NodeProps, Handle, Position, type Node} from "@xyflow/react";

import {formatWithMode} from "@app/lib/utils/format.ts";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import type {
    ParallelStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { useValidationIndicator } from '@scenario/core/ui/nodes/shared/ValidationIndicator';
import { useNodeEdit } from '../shared/NodeEditButton';
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';

type Props = NodeProps<Node<FlowNodeData<ParallelStepDto>>>;

const ParallelStepEditContract = createPlaceholderContract('Параллель');
export function ParallelStepNode({ id, data, selected}: Props) {

    const handleType = data?.connectContext?.from.handleType;

    const { ValidationIndicator, containerClassName } = useValidationIndicator(id);
    const { EditButton, containerProps } = useNodeEdit(id, selected, ParallelStepEditContract);

    return (
        <div className={`${styles.container} ${containerClassName}`} aria-selected={selected}  {...containerProps}>
            {ValidationIndicator}
            {EditButton}
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <span className={styles.name}>Параллельный</span>


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


