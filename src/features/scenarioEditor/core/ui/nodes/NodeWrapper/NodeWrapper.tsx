// src/features/scenarioEditor/core/ui/nodes/NodeWrapper/NodeWrapper.tsx

import { Handle, Position } from '@xyflow/react';
import type {ReactNode} from 'react';
import styles from './NodeWrapper.module.css';
import type {ConnectFrom} from "@scenario/shared/contracts/models/ConnectFrom.ts";
import {useValidationIndicator} from "@scenario/core/ui/nodes/shared/ValidationIndicator";
import type {Guid} from "@app/lib/types/Guid.ts";
import {useNodeEdit} from "@scenario/core/ui/nodes/shared/NodeEditButton";
import type {NodeEditContract} from "@scenario/core/ui/nodes/shared/NodeEditModal";

interface NodeWrapperProps {
    id: Guid;
    children: ReactNode;
    handleType?: ConnectFrom | undefined;
    validateTarget: boolean;
    className: string;
    classNameWrapper?: string | undefined;
    selected: boolean;
    contract: NodeEditContract
}

export function NodeWrapper({
    id,
    children,
    handleType,
    validateTarget,
    className,
    classNameWrapper,
    selected,
    contract,
}: NodeWrapperProps) {

    // Валидация
    const { ValidationIndicator, containerClassName, hasErrors } = useValidationIndicator(id);

    const { EditButton, containerProps } = useNodeEdit(id, selected, contract, hasErrors);

    return (
        <div
            className={`${styles.nodeWrapper} ${classNameWrapper}`}
            {...containerProps}
        >
            <div
                className={`${className} ${styles.children} ${containerClassName}`}
                aria-selected={selected}
             >
                {ValidationIndicator}
                {EditButton}
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

        </div>
    );
}
