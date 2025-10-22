// src/features/scenarioEditor/core/ui/nodes/ConditionStepNode/ConditionStepNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { ConditionStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';
import type { Guid } from '@app/lib/types/Guid';
import { store } from '@/baseStore/store';
import { updateStep, addStep, deleteStep } from '@scenario/store/scenarioSlice';
import { ConditionStepNode } from './ConditionStepNode';

export const ConditionStepNodeContract: NodeTypeContract<ConditionStepDto> = {
    // ============================================================================
    // БАЗОВЫЕ ПОЛЯ
    // ============================================================================

    type: FlowType.Condition,
    displayName: 'Условие',
    Component: ConditionStepNode as any,

    // ============================================================================
    // МЕТА-ИНФОРМАЦИЯ
    // ============================================================================

    canHaveChildBranches: true, //  Может содержать дочерние ветки через stepBranchRelations

    getBranchLinkMode: () => 'condition', //  Режим связи — условный

    // ============================================================================
    // МАППИНГ DTO ↔ Node
    // ============================================================================

    mapFromDto: (dto, parentId) => ({
        id: dto.id,
        type: FlowType.Condition,
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
        console.warn('[ConditionStepNodeContract] Auto-expand not supported for steps');
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
                if (newWidth < 150 || newHeight < 80) {
                    return {
                        valid: false,
                        error: 'Минимальный размер для условного шага: 150x80'
                    };
                }
                return { valid: true };

            case 'attach':
                const { branchId } = params as { branchId: Guid };
                if (!branchId) {
                    return { valid: false, error: 'branchId не может быть пустым' };
                }
                return { valid: true };

            case 'detach':
                //  Проверяем stepBranchRelations
                if (dto.stepBranchRelations && dto.stepBranchRelations.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя отсоединить условный шаг с дочерними ветками. Сначала удалите ветки.',
                    };
                }
                return { valid: true };

            case 'delete':
                if (dto.childRelations && dto.childRelations.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя удалить степ с дочерними связями. Сначала удалите связи.',
                    };
                }
                //  Проверяем stepBranchRelations
                if (dto.stepBranchRelations && dto.stepBranchRelations.length > 0) {
                    return {
                        valid: false,
                        error: 'Нельзя удалить условный шаг с дочерними ветками. Сначала удалите ветки.',
                    };
                }
                return { valid: true };

            case 'auto-expand':
                return { valid: false, error: 'Auto-expand не поддерживается для степов' };

            case 'select':
                return { valid: true };

            default:
                return { valid: true };
        }
    },

    // ============================================================================
    // ХУКИ ЖИЗНЕННОГО ЦИКЛА
    // ============================================================================

    onCreated: (dto) => {
        console.log(`[ConditionStepNodeContract]  Created condition step: ${dto.id}`, {
            name: dto.name,
            branchId: dto.branchId,
            position: { x: dto.x, y: dto.y },
            branches: dto.stepBranchRelations?.length ?? 0,
        });

        // Проверяем, что есть хотя бы одна ветка для true/false
        if (!dto.stepBranchRelations || dto.stepBranchRelations.length === 0) {
            console.warn(
                `[ConditionStepNodeContract] ⚠️ Condition step ${dto.id} created without branch relations`
            );
        }
    },

    onBeforeDelete: (dto) => {
        console.log(`[ConditionStepNodeContract] 🗑️ Deleting condition step: ${dto.id}`, dto);

        // Логика очистки перед удалением
        if (dto.stepBranchRelations && dto.stepBranchRelations.length > 0) {
            console.error(
                '[ConditionStepNodeContract] ⚠️ Cannot delete: Step has branch relations!',
                {
                    branchRelations: dto.stepBranchRelations,
                }
            );
            // TODO: Можно добавить автоматическое удаление дочерних веток
            // for (const relation of dto.stepBranchRelations) {
            //     store.dispatch(deleteBranch({ branchId: relation.branchId }));
            // }
        }

        if (dto.childRelations && dto.childRelations.length > 0) {
            console.warn('[ConditionStepNodeContract] Step has child relations, cleaning up...');
            // TODO: Удалить связи через Redux
            // store.dispatch(deleteRelations(dto.childRelations.map(r => r.id)));
        }

        if (dto.parentRelations && dto.parentRelations.length > 0) {
            console.warn('[ConditionStepNodeContract] Step has parent relations, cleaning up...');
            // TODO: Удалить связи через Redux
            // store.dispatch(deleteRelations(dto.parentRelations.map(r => r.id)));
        }
    },

    onUpdated: (previousDto, newDto) => {
        console.log(`[ConditionStepNodeContract] 📝 Updated condition step: ${newDto.id}`, {
            changes: {
                name:
                    previousDto.name !== newDto.name
                        ? { from: previousDto.name, to: newDto.name }
                        : undefined,
                position:
                    previousDto.x !== newDto.x || previousDto.y !== newDto.y
                        ? {
                            from: { x: previousDto.x, y: previousDto.y },
                            to: { x: newDto.x, y: newDto.y },
                        }
                        : undefined,
                size:
                    previousDto.width !== newDto.width || previousDto.height !== newDto.height
                        ? {
                            from: { w: previousDto.width, h: previousDto.height },
                            to: { w: newDto.width, h: newDto.height },
                        }
                        : undefined,
                branchId:
                    previousDto.branchId !== newDto.branchId
                        ? { from: previousDto.branchId, to: newDto.branchId }
                        : undefined,
                branchRelations:
                    JSON.stringify(previousDto.stepBranchRelations) !==
                    JSON.stringify(newDto.stepBranchRelations)
                        ? {
                            from: previousDto.stepBranchRelations?.length ?? 0,
                            to: newDto.stepBranchRelations?.length ?? 0,
                        }
                        : undefined,
            },
        });

        // Логика реакции на изменения
        if (
            JSON.stringify(previousDto.stepBranchRelations) !==
            JSON.stringify(newDto.stepBranchRelations)
        ) {
            console.log(
                '[ConditionStepNodeContract] Branch relations changed, updating links...'
            );
            // TODO: Обновить визуальные связи с дочерними ветками
            // TODO: Валидировать, что есть ветки для true и false
        }
    },

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => {
        console.log('[ConditionStepNodeContract] Creating snapshot for:', dto.id);

        return {
            entityId: dto.id,
            entityType: FlowType.Condition,
            data: {
                ...dto,
                entityType: FlowType.Condition,
            } as Entity,
            timestamp: Date.now(),
        };
    },

    applySnapshot: (snapshot) => {
        console.log('[ConditionStepNodeContract] Applying snapshot (redo):', snapshot.entityId);

        // Убираем entityType перед отправкой в Redux
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            updateStep({
                stepId: dto.id,
                changes: dto as any,
            })
        );

        console.log('[ConditionStepNodeContract]  Snapshot applied');
    },

    revertSnapshot: (snapshot) => {
        console.log('[ConditionStepNodeContract] Reverting snapshot (undo):', snapshot.entityId);

        // Убираем entityType перед отправкой в Redux
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            updateStep({
                stepId: dto.id,
                changes: dto as any,
            })
        );

        console.log('[ConditionStepNodeContract]  Snapshot reverted');
    },

    createFromSnapshot: (snapshot) => {
        console.log(
            '[ConditionStepNodeContract] Creating step from snapshot:',
            snapshot.entityId
        );

        // Убираем entityType перед отправкой в Redux
        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            addStep({
                branchId: (dto as any).branchId,
                step: dto as any,
            })
        );

        console.log('[ConditionStepNodeContract]  Step created from snapshot');
    },

    deleteEntity: (entityId) => {
        console.log('[ConditionStepNodeContract] Deleting entity:', entityId);

        const state = store.getState();
        const step = state.scenario.steps[entityId];

        if (step) {
            // Проверяем дочерние ветки перед удалением
            if (
                (step as any).stepBranchRelations &&
                (step as any).stepBranchRelations.length > 0
            ) {
                console.error(
                    '[ConditionStepNodeContract] ⚠️ Cannot delete: Step has branch relations!',
                    (step as any).stepBranchRelations
                );
                // TODO: Можно добавить автоматическое удаление или показать предупреждение
                return;
            }

            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
            console.log('[ConditionStepNodeContract]  Entity deleted');
        } else {
            console.warn(`[ConditionStepNodeContract] ⚠️ Step ${entityId} not found for deletion`);
        }
    },
} as const;