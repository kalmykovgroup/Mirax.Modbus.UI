import styles from "./ParallelStepNode.module.css";
import {type NodeProps, type Node, Handle, Position} from "@xyflow/react";
import type {ConnectFrom} from "@app/scenario-designer/ScenarioEditorPage.tsx";

export type ParallelStepNodeProps = Node<{
    isConnecting?: boolean
    connectFrom: ConnectFrom
}, 'ParallelStepNodeProps'>;

export function ParallelStepNode(props: NodeProps<ParallelStepNodeProps>) {

    const connectFrom = props.data?.connectFrom as 'source' | 'target' | null;

    return (
        <div className={styles.container} >

            <span>Parallel Step</span>

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
