import {Handle, type NodeProps, NodeResizer, Position} from "@xyflow/react";
import styles from "./BranchNode.module.css";
import {type FlowNode} from "@app/scenario-designer/types/FlowNode.ts";
import {formatWithMode} from "@app/lib/utils/format.ts";
import {endBranchResize, startBranchResize} from "@app/scenario-designer/graph/branchResizeGuard.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";



export function BranchNode({ id, data, selected }: NodeProps<FlowNode>) {

    const connectFrom = data?.connectFrom as 'source' | 'target' | null;

    const isConnectValid = (data.connectFromType != FlowType.branchNode && data.connectFromType == FlowType.conditionStepNode) ||
        (data.connectFromType != FlowType.branchNode &&  data.connectFromType == FlowType.parallelStepNode);

    return (
        <div className={styles.container} aria-selected={selected}>

            <NodeResizer
                isVisible={selected}
                onResizeStart={() => startBranchResize(id)}
                onResizeEnd={() => endBranchResize(id)}
                // опционально: цвета/размеры ручек
                // lineStyle={{ stroke: 'var(--color-accent)' }}
                // handleStyle={{ width: 8, height: 8 }}
            />

            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>
            <span className={styles.name}>Ветка</span>

            <Handle className={styles.target} aria-selected={connectFrom === 'source' && isConnectValid}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />

        </div>
     );
}