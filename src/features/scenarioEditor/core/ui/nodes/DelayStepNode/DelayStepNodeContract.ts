// src/features/scenarioEditor/nodes/delayStep/DelayStepNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { DelayStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { DelayStepNode } from '@scenario/core/ui/nodes/DelayStepNode/DelayStepNode';
import type {NodeTypeContract} from "@scenario/shared/contracts/registry/NodeTypeContract.ts";
import type {FlowNode} from "@scenario/shared/contracts/models/FlowNode.ts";

export const DelayStepNodeContract: NodeTypeContract<DelayStepDto> = {
    type: FlowType.Delay,
    displayName: 'Задержка',
    Component: DelayStepNode,

    mapFromDto(dto, parentId) {
        return {
            id: dto.id,
            type: FlowType.Delay,
            position: { x: dto.x, y: dto.y },
            parentId,
            data: {
                object: dto,
                x: dto.x,
                y: dto.y,
                __persisted: true,
            },
            style: { zIndex: 1 },
            extent: 'parent',      // ✅ Свойство конкретной ноды
            expandParent: true,    // ✅ Свойство конкретной ноды
        } as FlowNode<DelayStepDto>;
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