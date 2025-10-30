import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";
import styles from "./DelayStepNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import  {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {DelayStepDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { formatMsHuman, parseDurationToMs } from "@scenario/core/ui/nodes/DelayStepNode/DelayTimeInput/DelayTimeInput.tsx";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import { useValidationIndicator } from '@scenario/core/ui/nodes/shared/ValidationIndicator';
import { useNodeEdit } from '../shared/NodeEditButton';
import { DelayStepEditContract } from './DelayStepEditContract';

type Props = NodeProps<Node<FlowNodeData<DelayStepDto>>>;

export function DelayStepNode({ id, data, selected}: Props) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;

    const validateTarget = type != FlowType.BranchNode

    const dto = data.object as DelayStepDto;

    // Валидация
    const { ValidationIndicator, containerClassName } = useValidationIndicator(id);
    const { EditButton, containerProps } = useNodeEdit(id, selected, DelayStepEditContract);

    // Форматирование времени для отображения
    const timeMs = parseDurationToMs(dto.timeSpan || '0');
    const formattedTime = formatMsHuman(timeMs);

    return (
        <div
            className={`${styles.nodeContainer} ${containerClassName}`}
            aria-selected={selected}
            {...containerProps}
        >
            {ValidationIndicator}
            {EditButton}

            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <div className={styles.timeDisplay}>
                {formattedTime || '0ms'}
            </div>

            <Handle
                className={`${styles.target}`} aria-selected={handleType === 'source'}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />


            <Handle
                className={`${styles.source}`}  aria-selected={handleType === 'target' && validateTarget}
                key="s1"
                id="s1"
                type="source"
                position={Position.Right}
            />

        </div>
    );
}
