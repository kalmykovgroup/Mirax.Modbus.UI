import styles from "./ParallelStepNode.module.css";
import {type NodeProps, type Node} from "@xyflow/react";

import {formatWithMode} from "@app/lib/utils/format.ts";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import type {
    ParallelStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';
import {NodeWrapper} from "@scenario/core/ui/nodes/NodeWrapper";

type Props = NodeProps<Node<FlowNodeData<ParallelStepDto>>>;

const ParallelStepEditContract = createPlaceholderContract('Параллель');
export function ParallelStepNode({ id, data, selected}: Props) {

    const handleType = data?.connectContext?.from.handleType;

    return (
        <NodeWrapper
            id={id}
            className={`${styles.nodeContainer}`}
            classNameWrapper={styles.nodeContainerWrapper}
            selected={selected}
            contract={ParallelStepEditContract}
            handleType={handleType}
            validateTarget={true}
        >
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <span className={styles.name}>Параллельный</span>


        </NodeWrapper>
    );
}


