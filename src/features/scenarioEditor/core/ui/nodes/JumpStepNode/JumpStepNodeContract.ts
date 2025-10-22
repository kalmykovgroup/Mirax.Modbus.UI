// src/features/scenarioEditor/core/ui/nodes/JumpStepNode/JumpStepNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { JumpStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';
import type { Guid } from '@app/lib/types/Guid';
import { store } from '@/baseStore/store';
import { updateStep, addStep, deleteStep } from '@scenario/store/scenarioSlice';
import { JumpStepNode } from './JumpStepNode';

export const JumpStepNodeContract: NodeTypeContract<JumpStepDto> = {
    // ============================================================================
    // БАЗОВЫЕ ПОЛЯ
    // ============================================================================

    type: FlowType.Jump,
    displayName: 'Переход',
    Component: JumpStepNode as any,

    // ============================================================================
    // МАППИНГ DTO ↔ Node
    // ============================================================================

    mapFromDto: (dto, parentId) => ({
        id: dto.id,
        type: FlowType.Jump,
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
        extent: 'parent',
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

    createResizeEntity: (dto, newWidth, newHeight) => ({
        ...dto,
        width: newWidth,
        height: newHeight,
    }),

    createAutoExpandEntity: (dto, newWidth, newHeight) => {
        console.warn('[JumpStepNodeContract] Auto-expand not supported for steps');
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
                const { newX, newY } = params as { newX: number; newY: number };
                if (newX < 0 || newY < 0) {
                    return { valid: false, error: 'Координаты не могут быть отрицательными' };
                }
                return { valid: true };

            case 'resize':
                const { newWidth, newHeight } = params as { newWidth: number; newHeight: number };
                if (newWidth < 100 || newHeight < 60) {
                    return { valid: false, error: 'Минимальный размер: 100x60' };
                }
                return { valid: true };

            case 'attach':
                const { branchId } = params as { branchId: Guid };
                if (!branchId) {
                    return { valid: false, error: 'branchId не может быть пустым' };
                }
                return { valid: true };

            case 'detach':
                //  Jump можно отсоединить всегда (jumpToStepId независим от branchId)
                return { valid: true };

            case 'delete':
                if (dto.childRelations && dto.childRelations.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя удалить степ с дочерними связями',
                    };
                }
                //  Предупреждаем, если есть jumpToStepId
                if (dto.jumpToStepId) {
                    console.warn(`[JumpStepNodeContract] Deleting Jump pointing to: ${dto.jumpToStepId}`);
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
        console.log(`[JumpStepNodeContract]  Created: ${dto.id}`, {
            jumpTo: dto.jumpToStepId,
        });
        if (!dto.jumpToStepId) {
            console.warn(`[JumpStepNodeContract] Created without jumpToStepId`);
        }
    },

    onBeforeDelete: (dto) => {
        console.log(`[JumpStepNodeContract] 🗑️ Deleting: ${dto.id}`);
        if (dto.jumpToStepId) {
            console.log(`[JumpStepNodeContract] Jump points to: ${dto.jumpToStepId}`);
        }
    },

    onUpdated: (previousDto, newDto) => {
        if (previousDto.jumpToStepId !== newDto.jumpToStepId) {
            console.log('[JumpStepNodeContract] Jump target changed:', {
                from: previousDto.jumpToStepId,
                to: newDto.jumpToStepId,
            });
        }
    },

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => ({
        entityId: dto.id,
        entityType: FlowType.Jump,
        data: { ...dto, entityType: FlowType.Jump } as Entity,
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
        const step = state.scenario.steps.entities[entityId];
        if (step) {
            store.dispatch(deleteStep({ branchId: step.branchId, stepId: entityId }));
        }
    },
} as const;