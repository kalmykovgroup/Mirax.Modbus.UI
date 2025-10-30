// src/features/scenarioEditor/core/ui/nodes/NodeWrapper/NodeWrapper.tsx

import { Handle, Position } from '@xyflow/react';
import type {ReactNode} from 'react';
import styles from './NodeWrapper.module.css';
import type {ConnectFrom} from "@scenario/shared/contracts/models/ConnectFrom.ts";

interface NodeWrapperProps {
    children: ReactNode;
    handleType?: ConnectFrom | undefined;
    validateTarget: boolean;
    className: string;
    selected: boolean;
    containerProps: {
        onMouseEnter: () => void
        onMouseLeave: () => void
    }
}

export function NodeWrapper({
    children,
    handleType,
    validateTarget,
    className,
    selected,
    containerProps
}: NodeWrapperProps) {
    return (
        <div
            className={className}
            aria-selected={selected}
            {...containerProps}
        >
            {children}

            <Handle
                className={`${styles.target}`} aria-selected={handleType === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />


            <Handle
                className={`${styles.target} ${styles.connectLeftBottom}`} aria-selected={handleType === 'source'}
                key="t2"
                id="t2"
                type="target"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source} ${styles.connectRightBottom}`} aria-selected={handleType === 'target' && validateTarget}
                key="s1"
                id="s1"
                type="source"
                position={Position.Right}
            />


            <Handle
                className={`${styles.source} ${styles.connectTop}`} aria-selected={handleType === 'target' && validateTarget}
                key="s2"
                id="s2"
                type="source"
                position={Position.Right}
            />

        </div>
    );
}
