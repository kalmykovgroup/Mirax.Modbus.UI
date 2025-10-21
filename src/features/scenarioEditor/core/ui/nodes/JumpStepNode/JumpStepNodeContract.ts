// src/features/scenarioEditor/nodes/jumpStep/JumpStepNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { JumpStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { JumpStepNode } from '@scenario/core/ui/nodes/JumpStepNode/JumpStepNode';

export const JumpStepNodeContract: NodeTypeContract<JumpStepDto> = {
    type: FlowType.Jump,
    displayName: 'Переход',
    Component: JumpStepNode,

    mapFromDto(dto, parentId) {
        return {
            id: dto.id,
            type: FlowType.Jump,
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
        } as FlowNode<JumpStepDto>;
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