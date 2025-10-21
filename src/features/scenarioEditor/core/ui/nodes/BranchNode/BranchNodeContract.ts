// src/features/scenarioEditor/nodes/branchNode/BranchNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import { BranchNode } from '@scenario/core/ui/nodes/BranchNode/BranchNode';
import {BranchCommands} from "@scenario/core/features/scenarioChangeCenter/commandBuilders.ts";

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
            selectable: false, // ← Ветка НЕ выделяется кликом
            draggable: false,
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

    createMoveCommand: (scenarioId, nodeId, previousState, newX, newY) => {
        return BranchCommands.update(
            scenarioId,
            {
                branchId: nodeId,
                previousState,
                newState: { ...previousState, x: newX, y: newY },
            },
            `Переместить ветку (${newX}, ${newY})`
        );
    },

    createResizeCommand: (scenarioId, nodeId, previousState, newWidth, newHeight) => {
        return BranchCommands.resize(
            scenarioId,
            {
                branchId: nodeId,
                previousState,
                newState: { ...previousState, width: newWidth, height: newHeight },
            },
            `Изменить размер ветки (${newWidth}x${newHeight})`
        );
    },
};