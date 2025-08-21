import {Handle,  type NodeProps, Position} from "@xyflow/react";
import styles from "./ActivitySystemNode.module.css";
import {type FlowNode} from "@app/scenario-designer/types/FlowNode.ts";
import {formatWithMode} from "@app/lib/utils/format.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";


export function ActivitySystemNode({ data, selected }: NodeProps<FlowNode>) {

    const connectFrom = data?.connectFrom as 'source' | 'target' | null;
    const validateTarget = data.connectFromType != FlowType.branchNode

    return (
        <div className={styles.container} aria-selected={selected}>
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <span className={styles.name}>System</span>

            <Handle
                className={`${styles.target}`} aria-selected={connectFrom === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source}`} aria-selected={connectFrom === 'target' && validateTarget}
                key="s1"
                id="s1"
                type="source"
                position={Position.Right}
            />

        </div>
    );
}