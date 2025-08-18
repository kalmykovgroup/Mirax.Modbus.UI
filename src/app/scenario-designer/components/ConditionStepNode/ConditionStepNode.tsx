import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";
import type {ConnectFrom} from "@app/scenario-designer/ScenarioEditorPage.tsx";
import styles from "./ConditionStepNode.module.css";

export type ConditionStepProps = Node<{
    isConnecting?: boolean
    connectFrom: ConnectFrom
}, 'ConditionStepProps'>;

export function ConditionStepNode(props: NodeProps<ConditionStepProps>) {

    const connectFrom = props.data?.connectFrom as 'source' | 'target' | null;

    return (
        <div className={styles.container} >

            <span>Condition</span>

            <Handle
                className={`${styles.targer} ${connectFrom === 'source' ? "targetConnectable" : null}`}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source} ${connectFrom === 'target' ? "sourceConnectable" : null}`}
                key="s1"
                id="s1"
                type="source"
                position={Position.Right}
            />

        </div>
    );
}