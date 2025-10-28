import styles from "./SignalStepNode.module.css";
import {type NodeProps, Handle, Position, type Node} from "@xyflow/react";

import {formatWithMode} from "@app/lib/utils/format.ts";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import type {SignalStepDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { withValidation } from '@scenario/core/ui/nodes/shared/withValidation/withValidation';



type Props = NodeProps<Node<FlowNodeData<SignalStepDto>>>;


function SignalStepNodeComponent({ data, selected}: Props) {

    const handleType = data?.connectContext?.from.handleType;

    return (
        <div className={`${styles.container}`} aria-selected={selected} >
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <span className={styles.name}>Сигнал</span>


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



        </div>
    );
}

export const SignalStepNode = withValidation(SignalStepNodeComponent);
