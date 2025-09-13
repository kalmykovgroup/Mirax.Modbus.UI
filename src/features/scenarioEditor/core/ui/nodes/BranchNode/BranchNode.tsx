import {Handle, type NodeProps, NodeResizer, Position} from "@xyflow/react";
import styles from "./BranchNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import  {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import type {FlowNode} from "@/features/scenarioEditor/shared/contracts/models/FlowNode.ts";
import {endBranchResize, startBranchResize} from "@scenario/core/branchResize/branchResizeGuard.ts";

export function BranchNode({ id, data, selected }: NodeProps<FlowNode>) {
    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;
    const isConnectValid =
        (type != FlowType.branchNode && type == FlowType.conditionStepNode) ||
        (type != FlowType.branchNode && type == FlowType.parallelStepNode);

    return (
        <div className={styles.container} aria-selected={selected}>
            {/* фон ветки — никак не ловит клики */}
            <div className={styles.bg} />

            <NodeResizer
                isVisible={selected}
                onResizeStart={() => startBranchResize(id)}
                onResizeEnd={() => endBranchResize(id)}
            />

            {/* чисто визуальный оверлей — тоже не ловит клики */}
            <span className={styles.coordinates}>
        <span>x:{formatWithMode(data.x, 2, true)}</span>
        <span>y:{formatWithMode(data.y, 2, true)}</span>
      </span>
            <span className={styles.name}>Ветка</span>

            {/* хэндл остаётся кликабельным */}
            <Handle
                className={styles.target}
                aria-selected={handleType === 'source' && isConnectValid}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />
        </div>
    );
}
