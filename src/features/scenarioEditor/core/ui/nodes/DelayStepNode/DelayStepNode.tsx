import {type Node, type NodeProps} from "@xyflow/react";
import styles from "./DelayStepNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import  {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {DelayStepDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { formatMsHuman, parseDurationToMs } from "@scenario/core/ui/nodes/DelayStepNode/DelayTimeInput/DelayTimeInput.tsx";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import { DelayStepEditContract } from './DelayStepEditContract';
import {NodeWrapper} from "@scenario/core/ui/nodes/NodeWrapper";
import type {ConnectFrom} from "@scenario/shared/contracts/models/ConnectFrom.ts";

type Props = NodeProps<Node<FlowNodeData<DelayStepDto>>>;

export function DelayStepNode({ id, data, selected}: Props) {

    const handleType: ConnectFrom | undefined = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;

    const validateTarget = type != FlowType.BranchNode

    const dto = data.object as DelayStepDto;

    // Форматирование времени для отображения
    const timeMs = parseDurationToMs(dto.timeSpan || '0');
    const formattedTime = formatMsHuman(timeMs);

    return (
        <NodeWrapper
            id={id}
            handleType={handleType}
            validateTarget={validateTarget}
            className={`${styles.nodeContainer}`}
            classNameWrapper={styles.nodeContainerWrapper}
            selected={selected}
            contract={DelayStepEditContract}
        >

            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <div className={styles.timeDisplay}>
                {formattedTime || '0ms'}
            </div>
        </NodeWrapper>
    );
}
