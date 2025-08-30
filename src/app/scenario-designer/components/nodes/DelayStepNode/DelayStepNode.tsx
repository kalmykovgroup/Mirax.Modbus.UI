import {Handle, type NodeProps, Position} from "@xyflow/react";
import styles from "./DelayStepNode.module.css";
import {type FlowNode} from "@app/scenario-designer/types/FlowNode.ts";
import {formatWithMode} from "@app/lib/utils/format.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";

export function DelayStepNode({ data, selected}: NodeProps<FlowNode>) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;

    const validateTarget = type != FlowType.branchNode




    return (
        <div className={styles.container} aria-selected={selected}>
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>


            <div className={styles.inputContainer}>
                <div className={`${styles.form__group} ${styles.field}`}>
                    <input type="input" className={styles.form__field} placeholder="Время ожидания" />
                    <label htmlFor="name" className={styles.form__label}>Время ожидания</label>
                </div> <span>ms.</span>
            </div>

            <Handle
                className={`${styles.target}`} aria-selected={handleType === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source}`}  aria-selected={handleType === 'target' && validateTarget}
                key="s1"
                id="s1"
                type="source"
                position={Position.Right}
            />

        </div>
    );
}