// src/features/scenarioEditor/nodes/delayStep/DelayStepNodeContract.ts
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type {
    NodeTypeContract,
    NodeMappingResult,
} from '@/features/scenarioEditor/shared/contracts/registry/NodeTypeContract';
import type { DelayStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { DelayStepNode } from '@scenario/core/ui/nodes/DelayStepNode/DelayStepNode';

export const DelayStepNodeContract: NodeTypeContract<DelayStepDto> = {
    type: FlowType.delayStepNode,
    dbTypeId: 2,
    displayName: 'Задержка',
    description: 'Пауза выполнения сценария на заданное время',
    Component: DelayStepNode,

    mapFromDto(dto, parentId): NodeMappingResult<DelayStepDto> {
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

    mapToDto(data, nodeId): DelayStepDto {
        return {
            ...data.object,
            id: nodeId,
            x: data.x,
            y: data.y,
        };
    },

    handles: {
        sources: [{ id: 'bottom' }],
        targets: [{ id: 'top' }],
    },

    extent: 'parent',
    expandParent: true,
} as const;