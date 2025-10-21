// src/features/scenarioEditor/nodes/jumpStep/JumpStepNodeContract.ts
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type {
    NodeTypeContract,
    NodeMappingResult,
} from '@/features/scenarioEditor/shared/contracts/registry/NodeTypeContract';
import type { JumpStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { JumpStepNode } from '@scenario/core/ui/nodes/JumpStepNode/JumpStepNode';

export const JumpStepNodeContract: NodeTypeContract<JumpStepDto> = {
    type: FlowType.jumpStepNode,
    dbTypeId: 6,
    displayName: 'Переход',
    description: 'Переход к указанному шагу',
    Component: JumpStepNode,

    mapFromDto(dto, parentId): NodeMappingResult<JumpStepDto> {
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

    mapToDto(data, nodeId): JumpStepDto {
        return {
            ...data.object,
            id: nodeId,
            x: data.x,
            y: data.y,
        };
    },

    handles: {
        sources: [{ id: 's1' }, { id: 's2' }],
        targets: [{ id: 't1' }, { id: 't2' }],
    },

    extent: 'parent',
    expandParent: true,
} as const;