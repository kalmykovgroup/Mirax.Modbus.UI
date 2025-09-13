import {Handle, type NodeProps, Position} from "@xyflow/react";

import styles from "./ActivityModbusNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import type {FlowNode} from "@/features/scenarioEditor/shared/contracts/models/FlowNode.ts";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";


export function ActivityModbusNode({ data, selected }: NodeProps<FlowNode>) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;
    const validateTarget = type != FlowType.branchNode

    return (
        <div className={styles.container} aria-selected={selected}>
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