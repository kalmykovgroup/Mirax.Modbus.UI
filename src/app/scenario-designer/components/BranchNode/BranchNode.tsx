import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";
import type {ConnectFrom} from "@app/scenario-designer/ScenarioEditorPage.tsx";
import styles from "./BranchNode.module.css";

export type BranchNodeProps = Node<{
    isConnecting?: boolean
    connectFrom: ConnectFrom
}, 'BranchNodeProps'>;

export function BranchNode(props: NodeProps<BranchNodeProps>) {

    const connectFrom = props.data?.connectFrom as 'source' | 'target' | null;

    return (
        <div className={styles.container} >

            <span>Branch</span>

            <Handle
                className={`${styles.targer} ${connectFrom === 'source' ? "targetConnectable" : null}`}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />

        </div>
     );
}