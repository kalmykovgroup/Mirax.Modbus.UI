// src/features/scenarioEditor/core/ui/nodes/SignalStepNode/SignalStepNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { SignalStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';
import type { Guid } from '@app/lib/types/Guid';
import { store } from '@/baseStore/store';
import { updateStep, addStep, deleteStep } from '@scenario/store/scenarioSlice';
import { SignalStepNode } from './SignalStepNode';

export const SignalStepNodeContract: NodeTypeContract<SignalStepDto> = {
    // ============================================================================
    // БАЗОВЫЕ ПОЛЯ
    // ============================================================================

    type: FlowType.Signal,
    displayName: 'Сигнал',
    Component: SignalStepNode as any,

    // ============================================================================
    // МАППИНГ DTO ↔ Node
    // ============================================================================

    mapFromDto: (dto, parentId) => ({
        id: dto.id,
        type: FlowType.Signal,
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
        console.warn('[SignalStepNodeContract] Auto-expand not supported for steps', newWidth, newHeight, newX, newY);
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

    validateOperation: (operation, dto, params) => {
        switch (operation) {
            case 'move':
                // Проверяем, что новые координаты валидны
                const { newX, newY } = params as { newX: number; newY: number };
                if (newX < 0 || newY < 0) {
                    return { valid: false, error: 'Координаты не могут быть отрицательными' };
                }
                return { valid: true };

            case 'resize':
                // Проверяем минимальный размер для Signal Step
                const { newWidth, newHeight } = params as { newWidth: number; newHeight: number };
                if (newWidth < 120 || newHeight < 60) {
                    return { valid: false, error: 'Минимальный размер: 120x60' };
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

                // Проверяем, что нет родительских связей (опционально)
                if (dto.parentRelations && dto.parentRelations.length > 0) {
                    console.warn('[SignalStepNodeContract] Step has parent relations, they will be cleaned up');
                }

                return { valid: true };

            case 'auto-expand':
                // Для степов не поддерживается
                return { valid: false, error: 'Auto-expand не поддерживается для степов' };

            case 'select':
                // Всегда можно выбрать
                return { valid: true };

            default:
                return { valid: true };
        }
    },

    // ============================================================================
    // ХУКИ ЖИЗНЕННОГО ЦИКЛА
    // ============================================================================

    onCreated: (dto) => {
        console.log(`[SignalStepNodeContract]  Created signal step: ${dto.id}`, {
            name: dto.name,
            branchId: dto.branchId,
            position: { x: dto.x, y: dto.y },
        });

        // Можно добавить логику инициализации, например:
        // - Установить значения по умолчанию
        // - Создать связи с другими нодами
        // - Вызвать внешние API для регистрации сигнала
    },

    onBeforeDelete: (dto) => {
        console.log(`[SignalStepNodeContract] 🗑️ Deleting signal step: ${dto.id}`, dto);

        // Логика очистки перед удалением
        if (dto.childRelations && dto.childRelations.length > 0) {
            console.warn('[SignalStepNodeContract] Step has child relations, cleaning up...');
            // TODO: Удалить связи через Redux
            // store.dispatch(deleteRelations(dto.childRelations.map(r => r.id)));
        }

        if (dto.parentRelations && dto.parentRelations.length > 0) {
            console.warn('[SignalStepNodeContract] Step has parent relations, cleaning up...');
            // TODO: Удалить связи через Redux
            // store.dispatch(deleteRelations(dto.parentRelations.map(r => r.id)));
        }
    },

    onUpdated: (previousDto, newDto) => {
        console.log(`[SignalStepNodeContract] 📝 Updated signal step: ${newDto.id}`, {
            changes: {
                name: previousDto.name !== newDto.name ? { from: previousDto.name, to: newDto.name } : undefined,
                position: previousDto.x !== newDto.x || previousDto.y !== newDto.y
                    ? { from: { x: previousDto.x, y: previousDto.y }, to: { x: newDto.x, y: newDto.y } }
                    : undefined,
                size: previousDto.width !== newDto.width || previousDto.height !== newDto.height
                    ? { from: { w: previousDto.width, h: previousDto.height }, to: { w: newDto.width, h: newDto.height } }
                    : undefined,
                branchId: previousDto.branchId !== newDto.branchId
                    ? { from: previousDto.branchId, to: newDto.branchId }
                    : undefined,
            },
        });

        // Можно добавить логику реакции на изменения, например:
        // - Обновить связи, если изменился branchId
        // - Перепозиционировать дочерние ноды
        // - Вызвать внешние API для синхронизации
    },

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => {
        console.log('[SignalStepNodeContract] Creating snapshot for:', dto.id);

        return {
            entityId: dto.id,
            entityType: FlowType.Signal,
            data: {
                ...dto,
                entityType: FlowType.Signal,
            } as Entity,
            timestamp: Date.now(),
        };
    },

    applySnapshot: (snapshot) => {
        console.log('[SignalStepNodeContract] Applying snapshot (redo):', snapshot.entityId);

        // Убираем entityType перед отправкой в Redux (он нужен только для истории)
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            updateStep({
                stepId: dto.id,
                changes: dto as any,
            })
        );

        console.log('[SignalStepNodeContract]  Snapshot applied');
    },

    revertSnapshot: (snapshot) => {
        console.log('[SignalStepNodeContract] Reverting snapshot (undo):', snapshot.entityId);

        // Убираем entityType перед отправкой в Redux
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            updateStep({
                stepId: dto.id,
                changes: dto as any,
            })
        );

        console.log('[SignalStepNodeContract]  Snapshot reverted');
    },

    createFromSnapshot: (snapshot) => {
        console.log('[SignalStepNodeContract] Creating step from snapshot:', snapshot.entityId);

        // Убираем entityType перед отправкой в Redux
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            addStep({
                branchId: (dto as any).branchId,
                step: dto as any,
            })
        );

        console.log('[SignalStepNodeContract]  Step created from snapshot');
    },

    deleteEntity: (entityId) => {
        console.log('[SignalStepNodeContract] Deleting entity:', entityId);

        const state = store.getState();
        const step = state.scenario.steps[entityId];

        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
            console.log('[SignalStepNodeContract]  Entity deleted');
        } else {
            console.warn(`[SignalStepNodeContract] ⚠️ Step ${entityId} not found for deletion`);
        }
    },
} as const;