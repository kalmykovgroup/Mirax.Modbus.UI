import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";

import styles from "./ActivityModbusNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import type {
    ActivityModbusStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { useValidationIndicator } from '@scenario/core/ui/nodes/shared/ValidationIndicator';
import { useNodeEdit } from '../shared/NodeEditButton';
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';

type Props = NodeProps<Node<FlowNodeData<ActivityModbusStepDto>>>;

const ActivityModbusEditContract = createPlaceholderContract('Modbus');
export function ActivityModbusNode({ id, data, selected }: Props) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;
    const validateTarget = type != FlowType.BranchNode

    const { ValidationIndicator, containerClassName } = useValidationIndicator(id);
    const { EditButton, containerProps } = useNodeEdit(id, selected, ActivityModbusEditContract);

    return (
        <div className={`${styles.nodeContainer} ${containerClassName}`} aria-selected={selected} {...containerProps}>
            {ValidationIndicator}
            {EditButton}
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>
            <span className={styles.name}>Modbus</span>

            <Handle
                className={`${styles.target}`} aria-selected={handleType === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source}`} aria-selected={handleType === 'target' && validateTarget}
                key="s1"
                id="s1"
                type="source"
                position={Position.Right}
            />

        </div>
    );
}