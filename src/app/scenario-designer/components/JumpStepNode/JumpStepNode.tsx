import styles from "./JumpStepNode.module.css";
import {type NodeProps, type Node, Handle, Position} from "@xyflow/react";
import type {ConnectFrom} from "@app/scenario-designer/ScenarioEditorPage.tsx";

export type JumpStepNodeProps = Node<{
    isConnecting?: boolean
    connectFrom: ConnectFrom
}, 'JumpStepNodeProps'>;

export function JumpStepNode(props: NodeProps<JumpStepNodeProps>) {

    const connectFrom = props.data?.connectFrom as 'source' | 'target' | null;


    return (
        <div className={styles.container} >

            <span>Jump Step</span>

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
