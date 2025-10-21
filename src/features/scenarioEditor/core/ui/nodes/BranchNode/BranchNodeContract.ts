// src/features/scenarioEditor/nodes/branchNode/BranchNodeContract.ts
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type { NodeTypeContract, NodeMappingResult } from '@/features/scenarioEditor/shared/contracts/registry/NodeTypeContract';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import { BranchNode } from '@scenario/core/ui/nodes/BranchNode/BranchNode';

const DEFAULT_BRANCH_W = 320;
const DEFAULT_BRANCH_H = 100;

export const BranchNodeContract: NodeTypeContract<BranchDto> = {
    type: FlowType.branchNode,
    displayName: 'Ветка',
    description: 'Контейнер для группы шагов',
    Component: BranchNode,
    canHaveChildren: true,

    mapFromDto(dto, parentId): NodeMappingResult<BranchDto> {
        const width = dto.width > 0 ? dto.width : DEFAULT_BRANCH_W;
        const height = dto.height > 0 ? dto.height : DEFAULT_BRANCH_H;

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
            style: { width, height, zIndex: 0 },
        };
    },

    mapToDto(data, nodeId): BranchDto {
        return {
            ...data.object,
            id: nodeId,
            x: data.x,
            y: data.y,
        };
    },

    handles: {
        targets: [{ id: 't1' }],
    },
} as const;