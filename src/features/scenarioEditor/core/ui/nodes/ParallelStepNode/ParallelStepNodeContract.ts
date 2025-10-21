// src/features/scenarioEditor/nodes/parallelStep/ParallelStepNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { ParallelStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { ParallelStepNode } from '@scenario/core/ui/nodes/ParallelStepNode/ParallelStepNode';

export const ParallelStepNodeContract: NodeTypeContract<ParallelStepDto> = {
    type: FlowType.Parallel,
    displayName: 'Параллельный шаг',
    Component: ParallelStepNode,

    mapFromDto(dto, parentId) {
        return {
            id: dto.id,
            type: FlowType.Parallel,
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
        } as FlowNode<ParallelStepDto>;
    },

    mapToDto(node) {
        return {
            ...node.data.object,
            id: node.id,
            x: node.data.x,
            y: node.data.y,
        };
    },

    canHaveChildBranches: true,
    getBranchLinkMode: () => 'parallel',
};