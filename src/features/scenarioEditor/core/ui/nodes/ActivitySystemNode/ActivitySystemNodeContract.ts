// src/features/scenarioEditor/nodes/activitySystem/ActivitySystemNodeContract.ts
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type {
    NodeTypeContract,
    NodeMappingResult,
} from '@/features/scenarioEditor/shared/contracts/registry/NodeTypeContract';
import type { SystemActivityStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { ActivitySystemNode } from '@scenario/core/ui/nodes/ActivitySystemNode/ActivitySystemNode';

export const ActivitySystemNodeContract: NodeTypeContract<SystemActivityStepDto> = {
    type: FlowType.activitySystemNode,
    dbTypeId: 0,
    displayName: 'Системное действие',
    description: 'Выполнение системного действия',
    Component: ActivitySystemNode,

    mapFromDto(dto, parentId): NodeMappingResult<SystemActivityStepDto> {
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

    mapToDto(data, nodeId): SystemActivityStepDto {
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