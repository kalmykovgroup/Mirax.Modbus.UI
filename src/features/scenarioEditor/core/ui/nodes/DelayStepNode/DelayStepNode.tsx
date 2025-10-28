import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";
import styles from "./DelayStepNode.module.css";
import {formatWithMode} from "@app/lib/utils/format.ts";
import  {FlowType} from "@scenario/core/ui/nodes/types/flowType.ts";
import type {DelayStepDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import DelayTimeInput from "@scenario/core/ui/nodes/DelayStepNode/DelayTimeInput/DelayTimeInput.tsx";
import type {FlowNodeData} from "@scenario/shared/contracts/models/FlowNodeData.ts";
import { withValidation } from '@scenario/core/ui/nodes/shared/withValidation/withValidation';

const onChangeDto = (dto: DelayStepDto) =>{
    console.log(dto);
}

type Props = NodeProps<Node<FlowNodeData<DelayStepDto>>>;

function DelayStepNodeComponent({ data, selected}: Props) {

    const handleType = data?.connectContext?.from.handleType;
    const type : FlowType | undefined = data?.connectContext?.from.type;

    const validateTarget = type != FlowType.BranchNode

    const dto = data.object as DelayStepDto;

    return (
        <div className={styles.container} aria-selected={selected}>
            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>


            <div className={styles.inputContainer}>
                <div className={`${styles.form__group} ${styles.field}`}>
                    <DelayTimeInput
                        value={dto.timeSpan} // здесь у вас миллисекунды строкой, например "60000"
                        onChange={(nextMs) => onChangeDto({ ...dto, timeSpan: nextMs })}
                        minMs={0}
                        maxMs={Number.MAX_SAFE_INTEGER}
                    />
                </div>
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

// Экспортируем обернутый компонент с валидацией
export const DelayStepNode = withValidation(DelayStepNodeComponent);