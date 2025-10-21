// src/features/scenarioEditor/nodes/conditionStep/ConditionStepNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { ConditionStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { ConditionStepNode } from '@scenario/core/ui/nodes/ConditionStepNode/ConditionStepNode';

export const ConditionStepNodeContract: NodeTypeContract<ConditionStepDto> = {
    type: FlowType.Condition,
    displayName: 'Условие',
    Component: ConditionStepNode,

    mapFromDto(dto, parentId) {
        return {
            id: dto.id,
            type: FlowType.Condition,
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
        } as FlowNode<ConditionStepDto>;
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
    getBranchLinkMode: () => 'condition',
};