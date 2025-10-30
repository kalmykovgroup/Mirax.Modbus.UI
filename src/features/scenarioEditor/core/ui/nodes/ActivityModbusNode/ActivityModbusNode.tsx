import {type Node, type NodeProps} from "@xyflow/react";

import styles from "./ActivityModbusNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import type {
    ActivityModbusStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { createPlaceholderContract } from '../shared/NodeEditModal/contracts/PlaceholderEditContract';
import {NodeWrapper} from "@scenario/core/ui/nodes/NodeWrapper";

type Props = NodeProps<Node<FlowNodeData<ActivityModbusStepDto>>>;

const ActivityModbusEditContract = createPlaceholderContract('Modbus');
export function ActivityModbusNode({ id, data, selected }: Props) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;
    const validateTarget = type != FlowType.BranchNode

    return (
        <NodeWrapper
            id={id}
            className={`${styles.nodeContainer}`}
            classNameWrapper={styles.nodeContainerWrapper}
            selected={selected}
            handleType={handleType}
            contract={ActivityModbusEditContract}
            validateTarget={validateTarget}
        >
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>
            <span className={styles.name}>Modbus</span>


        </NodeWrapper>
    );
}