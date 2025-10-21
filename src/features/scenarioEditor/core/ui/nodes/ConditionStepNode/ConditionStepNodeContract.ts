// src/features/scenarioEditor/nodes/conditionStep/ConditionStepNodeContract.ts
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type {
    NodeTypeContract,
    NodeMappingResult,
} from '@/features/scenarioEditor/shared/contracts/registry/NodeTypeContract';
import type { ConditionStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { ConditionStepNode } from '@scenario/core/ui/nodes/ConditionStepNode/ConditionStepNode';

export const ConditionStepNodeContract: NodeTypeContract<ConditionStepDto> = {
    type: FlowType.conditionStepNode,
    dbTypeId: 3,
    displayName: 'Условие',
    description: 'Условное ветвление выполнения',
    Component: ConditionStepNode,

    mapFromDto(dto, parentId): NodeMappingResult<ConditionStepDto> {
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

    mapToDto(data, nodeId): ConditionStepDto {
        return {
            ...data.object,
            id: nodeId,
            x: data.x,
            y: data.y,
        };
    },

    handles: {
        sources: [
            { id: 's1', label: '1' },
            { id: 's2', label: '2' },
            { id: 's3', label: '3' },
        ],
        targets: [{ id: 't1' }],
    },

    canHaveChildren: true,
    extent: 'parent',
    expandParent: true,
} as const;