// src/features/scenarioEditor/core/ui/nodes/BranchNode/BranchNode.tsx
import { Handle, type NodeProps, type Node, NodeResizer, Position } from '@xyflow/react';
import styles from './BranchNode.module.css';
import { formatWithMode } from '@app/lib/utils/format';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import { endBranchResize, startBranchResize } from '@scenario/core/branchResize/branchResizeGuard';
import type { FlowNodeData } from '@/features/scenarioEditor/shared/contracts/models/FlowNodeData';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';

// Правильная типизация: NodeProps<Node<FlowNodeData<BranchDto>>>
type Props = NodeProps<Node<FlowNodeData<BranchDto>>>;

export function BranchNode({ id, data, selected }: Props) {
    const handleType = data.connectContext?.from.handleType;
    const type = data.connectContext?.from.type;
    const isConnectValid =
        type !== FlowType.BranchNode &&
        (type === FlowType.Condition || type === FlowType.Parallel);

    return (
        <div className={styles.container} aria-selected={selected}>
            <div className={styles.bg} />
            <NodeResizer
                isVisible={selected}
                onResizeStart={() => startBranchResize(id)}
                onResizeEnd={() => endBranchResize(id)}
            />
            <span className={styles.coordinates}>
        <span>x:{formatWithMode(data.x, 2, true)}</span>
        <span>y:{formatWithMode(data.y, 2, true)}</span>
      </span>
            <span className={styles.name}>Ветка</span>
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
