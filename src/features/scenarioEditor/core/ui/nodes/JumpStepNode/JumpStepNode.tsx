import styles from "./JumpStepNode.module.css";
import {type NodeProps, Handle, Position, type Node} from "@xyflow/react";
import {formatWithMode} from "@app/lib/utils/format.ts";
import  {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import type {
    JumpStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { useValidationIndicator } from '@scenario/core/ui/nodes/shared/ValidationIndicator';
import { useNodeEdit } from '../shared/NodeEditButton';
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';

type Props = NodeProps<Node<FlowNodeData<JumpStepDto>>>;

const JumpStepEditContract = createPlaceholderContract('Переход');

export function JumpStepNode({ id, data, selected}: Props) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;

    const validateTarget = type != FlowType.BranchNode

    const { ValidationIndicator, containerClassName } = useValidationIndicator(id);
    const { EditButton, containerProps } = useNodeEdit(id, selected, JumpStepEditContract);

    return (
        <div className={`${styles.jumpStepNodeContainer} ${containerClassName}`} aria-selected={selected} {...containerProps}>
            {ValidationIndicator}
            {EditButton}
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>

            </span>

            <span className={styles.name}>Переход</span>

            <Handle
                className={`${styles.target} ${styles.connectTop}`} aria-selected={handleType === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />

            <Handle
                className={`${styles.source} ${styles.connectRightBottom}`} aria-selected={handleType === 'target' && validateTarget}
                key="s1"
                id="s1"
                type="source"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source} ${styles.connectTop}`} aria-selected={handleType === 'target' && validateTarget}
                key="s2"
                id="s2"
                type="source"
                position={Position.Right}
            />

            <Handle
                className={`${styles.target} ${styles.connectLeftBottom}`} aria-selected={handleType === 'source'}
                key="t2"
                id="t2"
                type="target"
                position={Position.Right}
            />

        </div>
    );
}
