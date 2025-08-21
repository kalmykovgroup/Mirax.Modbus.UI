import styles from "./JumpStepNode.module.css";
import {type NodeProps, Handle, Position} from "@xyflow/react";
import {type FlowNode} from "@app/scenario-designer/types/FlowNode.ts";
import {formatWithMode} from "@app/lib/utils/format.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";


export function JumpStepNode({ data, selected}: NodeProps<FlowNode>) {

    const connectFrom = data?.connectFrom as 'source' | 'target' | null;

    const validateTarget = data.connectFromType != FlowType.branchNode

    return (
        <div className={styles.container} aria-selected={selected}>
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>

            </span>

            <span className={styles.name}>Переход</span>

            <Handle
                className={`${styles.target} ${styles.connectTop}`} aria-selected={connectFrom === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />

            <Handle
                className={`${styles.source} ${styles.connectRightBottom}`} aria-selected={connectFrom === 'target' && validateTarget}
                key="s1"
                id="s1"
                type="source"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source} ${styles.connectTop}`} aria-selected={connectFrom === 'target' && validateTarget}
                key="s2"
                id="s2"
                type="source"
                position={Position.Right}
            />

            <Handle
                className={`${styles.target} ${styles.connectLeftBottom}`} aria-selected={connectFrom === 'source'}
                key="t2"
                id="t2"
                type="target"
                position={Position.Right}
            />

        </div>
    );
}
