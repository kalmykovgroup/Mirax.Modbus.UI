// src/features/scenarioEditor/core/ui/nodes/ParallelStepNode/ParallelStepNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { ParallelStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';
import type { Guid } from '@app/lib/types/Guid';
import { store } from '@/baseStore/store';
import { updateStep, addStep, deleteStep } from '@scenario/store/scenarioSlice';
import { ParallelStepNode } from './ParallelStepNode';

export const ParallelStepNodeContract: NodeTypeContract<ParallelStepDto> = {
    // ============================================================================
    // БАЗОВЫЕ ПОЛЯ
    // ============================================================================

    type: FlowType.Parallel,
    displayName: 'Параллельный шаг',
    Component: ParallelStepNode as any,

    // ============================================================================
    // МЕТА-ИНФОРМАЦИЯ
    // ============================================================================

    canHaveChildBranches: true, //  Может содержать дочерние ветки через stepBranchRelations

    getBranchLinkMode: () => 'parallel', //  Режим связи — параллельный

    // ============================================================================
    // МАППИНГ DTO ↔ Node
    // ============================================================================

    mapFromDto: (dto, parentId) => ({
        id: dto.id,
        type: FlowType.Parallel,
        position: { x: dto.x, y: dto.y },
        data: {
            object: dto,
            x: dto.x,
            y: dto.y,
            __persisted: true,
        },
        style: {
            width: dto.width,
            height: dto.height,
            zIndex: 1,
        },
        parentId,
        draggable: true,
        selectable: true,
        expandParent: true,
    }),

    mapToDto: (node) => ({
        ...node.data.object,
        id: node.id,
        x: node.data.x,
        y: node.data.y,
    }),

    // ============================================================================
    // ОПЕРАЦИИ С НОДОЙ
    // ============================================================================

    createMoveEntity: (dto, newX, newY) => ({
        ...dto,
        x: newX,
        y: newY,
    }),

    createResizeEntity: (dto, newWidth, newHeight, newX, newY) => ({
        ...dto,
        x: newX ?? dto.x,
        y: newY ?? dto.y,
        width: newWidth,
        height: newHeight,
    }),

    createAutoExpandEntity: (dto, newWidth, newHeight, newX, newY) => {
        console.warn('[ParallelStepNodeContract] Auto-expand not supported for steps', newWidth, newHeight, newX, newY);
        return dto;
    },

    createAttachToBranchEntity: (dto, branchId, newX, newY) => ({
        ...dto,
        branchId,
        x: newX,
        y: newY,
    }),

    createDetachFromBranchEntity: (dto, newX, newY) => ({
        ...dto,
        branchId: '',
        x: newX,
        y: newY,
    }),

    // ============================================================================
    // ВАЛИДАЦИЯ
    // ============================================================================

    validateOperation: (operation, dto, params) => {
        switch (operation) {
            case 'move':
                // ReactFlow допускает любые координаты (включая отрицательные)
                // Валидация не требуется
                return { valid: true };

            case 'resize':
                const { newWidth, newHeight } = params as { newWidth: number; newHeight: number };
                if (newWidth < 150 || newHeight < 80) {
                    return { valid: false, error: 'Минимальный размер: 150x80' };
                }
                return { valid: true };

            case 'attach':
                const { branchId } = params as { branchId: Guid };
                if (!branchId) {
                    return { valid: false, error: 'branchId не может быть пустым' };
                }
                return { valid: true };

            case 'detach':
                //  Проверяем stepBranchRelations (не childBranchIds!)
                if (dto.stepBranchRelations && dto.stepBranchRelations.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя отсоединить параллельный шаг с дочерними ветками',
                    };
                }
                return { valid: true };

            case 'delete':
                if (dto.childRelations && dto.childRelations.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя удалить степ с дочерними связями',
                    };
                }
                //  Проверяем stepBranchRelations
                if (dto.stepBranchRelations && dto.stepBranchRelations.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя удалить параллельный шаг с дочерними ветками',
                    };
                }
                return { valid: true };

            default:
                return { valid: true };
        }
    },

    // ============================================================================
    // ХУКИ ЖИЗНЕННОГО ЦИКЛА
    // ============================================================================

    onCreated: (dto) => {
        console.log(`[ParallelStepNodeContract]  Created: ${dto.id}`, {
            branches: dto.stepBranchRelations?.length ?? 0,
        });
    },

    onBeforeDelete: (dto) => {
        console.log(`[ParallelStepNodeContract] 🗑️ Deleting: ${dto.id}`);
        if (dto.stepBranchRelations && dto.stepBranchRelations.length > 0) {
            console.warn('[ParallelStepNodeContract] Has branch relations:', dto.stepBranchRelations);
        }
    },

    onUpdated: (previousDto, newDto) => {
        if (JSON.stringify(previousDto.stepBranchRelations) !== JSON.stringify(newDto.stepBranchRelations)) {
            console.log('[ParallelStepNodeContract] Branch relations changed');
        }
    },

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => ({
        entityId: dto.id,
        entityType: FlowType.Parallel,
        data: { ...dto, entityType: FlowType.Parallel } as Entity,
        timestamp: Date.now(),
    }),

    applySnapshot: (snapshot) => {
        const { entityType, ...dto } = snapshot.data;
        store.dispatch(updateStep({ stepId: dto.id, changes: dto as any }));
    },

    revertSnapshot: (snapshot) => {
        const { entityType, ...dto } = snapshot.data;
        store.dispatch(updateStep({ stepId: dto.id, changes: dto as any }));
    },

    createFromSnapshot: (snapshot) => {
        const { entityType, ...dto } = snapshot.data;
        store.dispatch(addStep({ branchId: (dto as any).branchId, step: dto as any }));
    },

    deleteEntity: (entityId) => {
        const state = store.getState();
        const step = state.scenario.steps[entityId];
        if (step) {
            store.dispatch(deleteStep({ branchId: step.branchId, stepId: entityId }));
        }
    },
} as const;