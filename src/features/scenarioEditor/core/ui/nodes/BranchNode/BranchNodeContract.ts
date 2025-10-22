// src/features/scenarioEditor/core/ui/nodes/BranchNode/BranchNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';

import { store } from '@/baseStore/store';
import { updateBranch, addBranch, deleteBranch } from '@scenario/store/scenarioSlice';
import { BranchNode } from './BranchNode';

export const BranchNodeContract: NodeTypeContract<BranchDto> = {
    type: FlowType.BranchNode,
    displayName: 'Ветка',
    Component: BranchNode as any,

    canHaveChildBranches: true,

    mapFromDto: (dto, parentId) => ({
        id: dto.id,
        type: FlowType.BranchNode,
        position: { x: dto.x, y: dto.y },
        data: {
            object: dto,
            x: dto.x,
            y: dto.y,
        },
        style: {
            width: dto.width,
            height: dto.height,
        },
        parentId,
        draggable: true,
        selectable: true,
    }),

    mapToDto: (node) => node.data.object,

    // ============================================================================
    // ОПЕРАЦИИ
    // ============================================================================

    createMoveEntity: (dto, newX, newY) => ({
        ...dto,
        x: newX,
        y: newY,
    }),

    createResizeEntity: (dto, newWidth, newHeight) => ({
        ...dto,
        width: newWidth,
        height: newHeight,
    }),

    createAutoExpandEntity: (dto, newWidth, newHeight) => ({
        ...dto,
        width: newWidth,
        height: newHeight,
    }),

    createAttachToBranchEntity: (dto, branchId, newX, newY) => {
        // Ветки не присоединяются к другим веткам
        console.warn('[BranchNodeContract] Branches cannot be attached to other branches');
        return dto;
    },

    createDetachFromBranchEntity: (dto, newX, newY) => {
        console.warn('[BranchNodeContract] Branches cannot be detached');
        return dto;
    },

    // ============================================================================
    // ВАЛИДАЦИЯ
    // ============================================================================

    validateOperation: (operation, dto, params) => {
        switch (operation) {
            case 'delete':
                if (dto.steps && dto.steps.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя удалить ветку с шагами',
                    };
                }
                return { valid: true };

            case 'resize':
            case 'auto-expand':
                const { newWidth, newHeight } = params as { newWidth: number; newHeight: number };
                if (newWidth < 200 || newHeight < 100) {
                    return { valid: false, error: 'Минимальный размер ветки: 200x100' };
                }
                return { valid: true };

            default:
                return { valid: true };
        }
    },

    // ============================================================================
    // ХУКИ
    // ============================================================================

    onCreated: (dto) => {
        console.log(`[BranchNodeContract] ✅ Created branch: ${dto.id}`);
    },

    onBeforeDelete: (dto) => {
        console.log(`[BranchNodeContract] 🗑️ Deleting branch: ${dto.id}`);
    },

    onUpdated: (previousDto, newDto) => {
        console.log(`[BranchNodeContract] 📝 Updated branch: ${newDto.id}`);
    },

    // ============================================================================
    // ИСТОРИЯ
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => ({
        entityId: dto.id,
        entityType: FlowType.BranchNode,
        data: {
            ...dto,
            entityType: FlowType.BranchNode,
        } as Entity,
        timestamp: Date.now(),
    }),

    applySnapshot: (snapshot) => {
        const { entityType, ...dto } = snapshot.data;
        store.dispatch(
            updateBranch({
                branchId: dto.id,
                changes: dto as any,
            })
        );
    },

    revertSnapshot: (snapshot) => {
        const { entityType, ...dto } = snapshot.data;
        store.dispatch(
            updateBranch({
                branchId: dto.id,
                changes: dto as any,
            })
        );
    },

    createFromSnapshot: (snapshot) => {
        const { entityType, ...dto } = snapshot.data;
        store.dispatch(
            addBranch({
                scenarioId: (dto as any).scenarioId,
                branch: dto as any,
                parentStepId: (dto as any).parallelStepId ?? (dto as any).conditionStepId ?? null,
            })
        );
    },

    deleteEntity: (entityId) => {
        store.dispatch(deleteBranch({ branchId: entityId }));
    },
} as const;