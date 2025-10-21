// src/features/scenarioEditor/nodes/branchNode/BranchNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import { BranchNode } from '@scenario/core/ui/nodes/BranchNode/BranchNode';

const DEFAULT_BRANCH_W = 320;
const DEFAULT_BRANCH_H = 100;

export const BranchNodeContract: NodeTypeContract<BranchDto> = {
    type: FlowType.BranchNode,
    displayName: 'Ветка',
    Component: BranchNode,

    mapFromDto(dto, parentId) {
        const width = dto.width > 0 ? dto.width : DEFAULT_BRANCH_W;
        const height = dto.height > 0 ? dto.height : DEFAULT_BRANCH_H;

        return {
            id: dto.id,
            type: FlowType.BranchNode,
            position: { x: dto.x, y: dto.y },
            parentId,
            data: {
                object: dto,
                x: dto.x,
                y: dto.y,
                __persisted: true,
            },
            style: { width, height, zIndex: 0 },
        } as FlowNode<BranchDto>;
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