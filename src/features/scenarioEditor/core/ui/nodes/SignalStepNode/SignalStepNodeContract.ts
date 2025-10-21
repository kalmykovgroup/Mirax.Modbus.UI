// src/features/scenarioEditor/nodes/signalStep/SignalStepNodeContract.ts
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type {
    NodeTypeContract,
    NodeMappingResult,
} from '@/features/scenarioEditor/shared/contracts/registry/NodeTypeContract';
import type { SignalStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { SignalStepNode } from '@scenario/core/ui/nodes/SignalStepNode/SignalStepNode';

export const SignalStepNodeContract: NodeTypeContract<SignalStepDto> = {
    type: FlowType.signalStepNode,
    dbTypeId: 5,
    displayName: 'Сигнал',
    description: 'Отправка или ожидание сигнала',
    Component: SignalStepNode,

    mapFromDto(dto, parentId): NodeMappingResult<SignalStepDto> {
        return {
            id: dto.id,
            position: { x: dto.x, y: dto.y },
            parentId,
            data: {
                object: dto,
                x: dto.x,
                y: dto.y,
                __persisted: true,
            },
            style: { zIndex: 1 },
            extent: 'parent',
            expandParent: true,
        };
    },

    mapToDto(data, nodeId): SignalStepDto {
        return {
            ...data.object,
            id: nodeId,
            x: data.x,
            y: data.y,
        };
    },

    handles: {
        sources: [{ id: 's1' }],
        targets: [{ id: 't1' }],
    },

    extent: 'parent',
    expandParent: true,
} as const;