import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";
import type {ConnectFrom} from "@app/scenario-designer/ScenarioEditorPage.tsx";
import styles from "./DelayStepNode.module.css";

export type DelayNodeProps = Node<{
    isConnecting?: boolean
    connectFrom: ConnectFrom,

}, 'DelayNodeProps'>;

export function DelayStepNode(props: NodeProps<DelayNodeProps>) {

    const connectFrom = props.data?.connectFrom as 'source' | 'target' | null;

    return (
        <div className={styles.container} >

            <span>Delay Step</span>
            <div className={styles.inputContainer}>
                <input type="number"/><span>ms.</span>
            </div>

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