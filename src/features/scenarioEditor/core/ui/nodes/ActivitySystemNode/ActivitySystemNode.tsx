import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";

import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";
import styles from "./ActivitySystemNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import  {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {
    ActivitySystemStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";

type Props = NodeProps<Node<FlowNodeData<ActivitySystemStepDto>>>;

export function ActivitySystemNode({ data, selected }: Props) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;
    const validateTarget = type != FlowType.BranchNode

    return (
        <div className={styles.container} aria-selected={selected}>
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <span className={styles.name}>System</span>

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