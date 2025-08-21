import styles from "./ParallelStepNode.module.css";
import {type NodeProps,  Handle, Position} from "@xyflow/react";

import {type FlowNode} from '@app/scenario-designer/types/FlowNode.ts'
import {formatWithMode} from "@app/lib/utils/format.ts";

export function ParallelStepNode({ data, selected}: NodeProps<FlowNode>) {

    const connectFrom = data?.connectFrom as 'source' | 'target' | null;

    return (
        <div className={`${styles.container}`} aria-selected={selected} >
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <span className={styles.name}>Параллельный</span>


            <Handle
                className={`${styles.target}`} aria-selected={connectFrom === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />

            <Handle
                className={`${styles.source} ${styles.sourceTop}`} aria-selected={connectFrom === 'target'}
                key="s1"
                id="s1"
                type="source"
                position={Position.Right}
            />

            <Handle
                className={`${styles.source}`} aria-selected={connectFrom === 'target'}
                key="s2"
                id="s2"
                type="source"
                position={Position.Right}
            />
            <Handle
                className={`${styles.source} ${styles.sourceBottom}`} aria-selected={connectFrom === 'target'}
                key="s3"
                id="s3"
                type="source"
                position={Position.Right}
            />


        </div>
    );
}
