// src/features/scenarioEditor/nodes/activitySystem/ActivitySystemNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { ActivitySystemStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { ActivitySystemNode } from '@scenario/core/ui/nodes/ActivitySystemNode/ActivitySystemNode';

export const ActivitySystemNodeContract: NodeTypeContract<ActivitySystemStepDto> = {
    type: FlowType.ActivitySystem,
    displayName: 'Системное действие',
    Component: ActivitySystemNode,

    mapFromDto(dto, parentId) {
        return {
            id: dto.id,
            type: FlowType.ActivitySystem,
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
        } as FlowNode<ActivitySystemStepDto>;
    },

    mapToDto(node) {
        return {
            ...node.data.object,
            id: node.id,
            x: node.data.x,
            y: node.data.y,
        };
    },
};