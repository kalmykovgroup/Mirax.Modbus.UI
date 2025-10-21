// src/features/scenarioEditor/nodes/signalStep/SignalStepNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { SignalStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { SignalStepNode } from '@scenario/core/ui/nodes/SignalStepNode/SignalStepNode';

export const SignalStepNodeContract: NodeTypeContract<SignalStepDto> = {
    type: FlowType.Signal,
    displayName: 'Сигнал',
    Component: SignalStepNode,

    mapFromDto(dto, parentId) {
        return {
            id: dto.id,
            type: FlowType.Signal,
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
        } as FlowNode<SignalStepDto>;
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