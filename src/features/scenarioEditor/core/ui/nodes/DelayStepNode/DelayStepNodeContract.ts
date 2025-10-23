// src/features/scenarioEditor/core/ui/nodes/DelayStepNode/DelayStepNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { DelayStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';
import type { Guid } from '@app/lib/types/Guid';
import { store } from '@/baseStore/store';
import { updateStep, addStep, deleteStep } from '@scenario/store/scenarioSlice';
import { DelayStepNode } from './DelayStepNode';

export const DelayStepNodeContract: NodeTypeContract<DelayStepDto> = {
    // ============================================================================
    // БАЗОВЫЕ ПОЛЯ
    // ============================================================================

    type: FlowType.Delay,
    displayName: 'Задержка',
    Component: DelayStepNode as any,

    // ============================================================================
    // МАППИНГ DTO ↔ Node
    // ============================================================================

    mapFromDto: (dto, parentId) => ({
        id: dto.id,
        type: FlowType.Delay,
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
        expandParent: true,
    }),

    mapToDto: (node) => node.data.object,

    // ============================================================================
    // ОПЕРАЦИИ С НОДОЙ (создают новый DTO)
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
        // Для степов auto-expand не применяется (только для веток)
        console.warn('[DelayStepNodeContract] Auto-expand not supported for steps', newWidth, newHeight, newX, newY);
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
        branchId: '', // Отсоединяем от ветки
        x: newX,
        y: newY,
    }),

    // ============================================================================
    // ВАЛИДАЦИЯ ОПЕРАЦИЙ
    // ============================================================================

    // Пример исправления validateOperation для DelayStepNodeContract.ts
    // Применить аналогичные изменения ко всем контрактам из списка

    validateOperation: (operation, dto, params) => {
        switch (operation) {
            case 'move':
                // ReactFlow допускает любые координаты (включая отрицательные)
                // Валидация не требуется
                return { valid: true };

            case 'resize':
                // Проверяем минимальный размер
                const { newWidth, newHeight } = params as { newWidth: number; newHeight: number };
                if (newWidth < 100 || newHeight < 60) {
                    return { valid: false, error: 'Минимальный размер: 100x60' };
                }
                return { valid: true };

            case 'attach':
                // Проверяем, что branchId не пустой
                const { branchId } = params as { branchId: Guid };
                if (!branchId) {
                    return { valid: false, error: 'branchId не может быть пустым' };
                }
                return { valid: true };

            case 'detach':
                // Степ можно отсоединить всегда
                return { valid: true };

            case 'delete':
                // Проверяем, что нет дочерних связей
                if (dto.childRelations && dto.childRelations.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя удалить степ с дочерними связями. Сначала удалите связи.',
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
        console.log(`[DelayStepNodeContract]  Created step: ${dto.id}`, dto);
    },

    onBeforeDelete: (dto) => {
        console.log(`[DelayStepNodeContract] 🗑️ Deleting step: ${dto.id}`, dto);

        // Можно добавить логику очистки дочерних связей
        if (dto.childRelations && dto.childRelations.length > 0) {
            console.warn('[DelayStepNodeContract] Step has child relations, cleaning up...');
            // TODO: Удалить связи через Redux
        }
    },

    onUpdated: (previousDto, newDto) => {
        console.log(`[DelayStepNodeContract] 📝 Updated step: ${newDto.id}`, {
            previous: previousDto,
            new: newDto,
        });
    },

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => ({
        entityId: dto.id,
        entityType: FlowType.Delay,
        data: {
            ...dto,
            entityType: FlowType.Delay,
        } as Entity,
        timestamp: Date.now(),
    }),

    applySnapshot: (snapshot) => {
        console.log('[DelayStepNodeContract] Applying snapshot:', snapshot);

        // Убираем entityType перед отправкой в Redux
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            updateStep({
                stepId: dto.id,
                changes: dto as any,
            })
        );
    },

    revertSnapshot: (snapshot) => {
        console.log('[DelayStepNodeContract] Reverting snapshot:', snapshot);

        // Убираем entityType перед отправкой в Redux
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            updateStep({
                stepId: dto.id,
                changes: dto as any,
            })
        );
    },

    createFromSnapshot: (snapshot) => {
        console.log('[DelayStepNodeContract] Creating from snapshot:', snapshot);

        // Убираем entityType перед отправкой в Redux
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            addStep({
                branchId: (dto as any).branchId,
                step: dto as any,
            })
        );
    },

    deleteEntity: (entityId) => {
        console.log('[DelayStepNodeContract] Deleting entity:', entityId);

        const state = store.getState();
        const step = state.scenario.steps[entityId];

        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
        } else {
            console.warn(`[DelayStepNodeContract] Step ${entityId} not found for deletion`);
        }
    },
} as const;