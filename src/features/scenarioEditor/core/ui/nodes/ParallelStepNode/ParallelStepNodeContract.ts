// src/features/scenarioEditor/nodes/parallelStep/ParallelStepNodeContract.ts
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type {
    NodeTypeContract,
    NodeMappingResult,
} from '@/features/scenarioEditor/shared/contracts/registry/NodeTypeContract';
import type { ParallelStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { ParallelStepNode } from '@scenario/core/ui/nodes/ParallelStepNode/ParallelStepNode';

export const ParallelStepNodeContract: NodeTypeContract<ParallelStepDto> = {
    type: FlowType.parallelStepNode,
    dbTypeId: 4,
    displayName: 'Параллельный шаг',
    description: 'Запуск параллельных веток выполнения',
    Component: ParallelStepNode,

    mapFromDto(dto, parentId): NodeMappingResult<ParallelStepDto> {
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

    mapToDto(data, nodeId): ParallelStepDto {
        return {
            ...data.object,
            id: nodeId,
            x: data.x,
            y: data.y,
        };
    },

    handles: {
        sources: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
        targets: [{ id: 't1' }],
    },

    canHaveChildren: true,
    extent: 'parent',
    expandParent: true,
} as const;