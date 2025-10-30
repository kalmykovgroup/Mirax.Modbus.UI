import styles from "./JumpStepNode.module.css";
import {type NodeProps, type Node} from "@xyflow/react";
import {formatWithMode} from "@app/lib/utils/format.ts";
import  {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import type {
    JumpStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';
import {NodeWrapper} from "@scenario/core/ui/nodes/NodeWrapper";

type Props = NodeProps<Node<FlowNodeData<JumpStepDto>>>;

const JumpStepEditContract = createPlaceholderContract('Переход');

export function JumpStepNode({ id, data, selected}: Props) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;

    const validateTarget = type != FlowType.BranchNode

    return (
        <NodeWrapper
            id={id}
            className={`${styles.nodeContainer}`}
            classNameWrapper={styles.nodeContainerWrapper}
            selected={selected}
            contract={JumpStepEditContract}
            handleType={handleType}
            validateTarget={validateTarget}
        >
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>

            </span>

            <span className={styles.name}>Переход</span>

        </NodeWrapper>
    );
}
