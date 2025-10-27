// src/features/scenarioEditor/core/ui/nodes/ActivitySystemNode/ActivitySystemNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { ActivitySystemStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';
import type { Guid } from '@app/lib/types/Guid';
import { store } from '@/baseStore/store';
import { updateStep, addStep, deleteStep, findScenarioIdByStepId } from '@scenario/store/scenarioSlice';
import { ActivitySystemNode } from './ActivitySystemNode';

export const ActivitySystemNodeContract: NodeTypeContract<ActivitySystemStepDto> = {
    // ============================================================================
    // БАЗОВЫЕ ПОЛЯ
    // ============================================================================

    type: FlowType.ActivitySystem,
    displayName: 'Системное действие',
    Component: ActivitySystemNode as any,

    // ============================================================================
    // МАППИНГ DTO ↔ Node
    // ============================================================================

    mapFromDto: (dto, parentId) => ({
        id: dto.id,
        type: FlowType.ActivitySystem,
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
        console.warn('[ActivitySystemNodeContract] Auto-expand not supported for steps', newWidth, newHeight, newX, newY);
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
                if (newWidth < 120 || newHeight < 70) {
                    return { valid: false, error: 'Минимальный размер: 120x70' };
                }
                return { valid: true };

            case 'attach':
                const { branchId } = params as { branchId: Guid };
                if (!branchId) {
                    return { valid: false, error: 'branchId не может быть пустым' };
                }
                return { valid: true };

            case 'detach':
                // Проверяем, что systemActionId установлен (должен быть валидным действием)
                if (!dto.systemActionId) {
                    return {
                        valid: false,
                        error: 'Нельзя отсоединить системное действие без systemActionId',
                    };
                }
                return { valid: true };

            case 'delete':
                // Степ можно удалить всегда. Связи будут удалены автоматически в deleteNode через batch.
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
        console.log(`[ActivitySystemNodeContract]  Created system activity: ${dto.id}`, {
            name: dto.name,
            branchId: dto.branchId,
            systemActionId: dto.systemActionId,
            position: { x: dto.x, y: dto.y },
        });

        // Проверяем, что systemActionId установлен
        if (!dto.systemActionId) {
            console.warn(
                `[ActivitySystemNodeContract] ⚠️ System activity ${dto.id} created without systemActionId`
            );
        }
    },

    onBeforeDelete: (dto) => {
        console.log(`[ActivitySystemNodeContract] 🗑️ Deleting system activity: ${dto.id}`, dto);

        if (dto.childRelations && dto.childRelations.length > 0) {
            console.warn('[ActivitySystemNodeContract] Step has child relations, cleaning up...');
            // TODO: Удалить связи через Redux
        }

        if (dto.parentRelations && dto.parentRelations.length > 0) {
            console.warn('[ActivitySystemNodeContract] Step has parent relations, cleaning up...');
            // TODO: Удалить связи через Redux
        }
    },

    onUpdated: (previousDto, newDto) => {
        console.log(`[ActivitySystemNodeContract] 📝 Updated system activity: ${newDto.id}`, {
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
                systemActionId:
                    previousDto.systemActionId !== newDto.systemActionId
                        ? { from: previousDto.systemActionId, to: newDto.systemActionId }
                        : undefined,
            },
        });

        // Логика реакции на изменения
        if (previousDto.systemActionId !== newDto.systemActionId) {
            console.log(
                `[ActivitySystemNodeContract] System action changed from ${previousDto.systemActionId} to ${newDto.systemActionId}`
            );
            // TODO: Обновить UI с новой информацией о действии
            // TODO: Валидировать существование нового системного действия
        }
    },

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => {
        console.log('[ActivitySystemNodeContract] Creating snapshot for:', dto.id);

        return {
            entityId: dto.id,
            entityType: FlowType.ActivitySystem,
            data: {
                ...dto,
                entityType: FlowType.ActivitySystem,
            } as Entity,
            timestamp: Date.now(),
        };
    },

    applySnapshot: (snapshot) => {
        console.log('[ActivitySystemNodeContract] Applying snapshot (redo):', snapshot.entityId);

        const { entityType, ...dto } = snapshot.data;
        const state = store.getState();
        const scenarioId = findScenarioIdByStepId(state.scenario, dto.id);

        if (!scenarioId) {
            console.error(`[ActivitySystemNodeContract] Scenario not found for step ${dto.id}`);
            return;
        }

        store.dispatch(
            updateStep({
                scenarioId,
                stepId: dto.id,
                changes: dto as any,
            })
        );

        console.log('[ActivitySystemNodeContract]  Snapshot applied');
    },

    revertSnapshot: (snapshot) => {
        console.log('[ActivitySystemNodeContract] Reverting snapshot (undo):', snapshot.entityId);

        const { entityType, ...dto } = snapshot.data;
        const state = store.getState();
        const scenarioId = findScenarioIdByStepId(state.scenario, dto.id);

        if (!scenarioId) {
            console.error(`[ActivitySystemNodeContract] Scenario not found for step ${dto.id}`);
            return;
        }

        store.dispatch(
            updateStep({
                scenarioId,
                stepId: dto.id,
                changes: dto as any,
            })
        );

        console.log('[ActivitySystemNodeContract]  Snapshot reverted');
    },

    createFromSnapshot: (snapshot) => {
        console.log(
            '[ActivitySystemNodeContract] Creating step from snapshot:',
            snapshot.entityId
        );

        const { entityType, ...dto } = snapshot.data;
        const branchId = (dto as any).branchId;
        const state = store.getState();

        let scenarioId: Guid | null = null;
        for (const [sid, scenarioState] of Object.entries(state.scenario.scenarios)) {
            if (scenarioState.branches[branchId]) {
                scenarioId = sid;
                break;
            }
        }

        if (!scenarioId) {
            console.error(`[ActivitySystemNodeContract] Scenario not found for branch ${branchId}`);
            return;
        }

        store.dispatch(
            addStep({
                scenarioId,
                branchId,
                step: dto as any,
            })
        );

        console.log('[ActivitySystemNodeContract]  Step created from snapshot');
    },

    deleteEntity: (entityId) => {
        console.log('[ActivitySystemNodeContract] Deleting entity:', entityId);

        const state = store.getState();
        const scenarioId = findScenarioIdByStepId(state.scenario, entityId);

        if (!scenarioId) {
            console.error(`[ActivitySystemNodeContract] Scenario not found for step ${entityId}`);
            return;
        }

        const step = state.scenario.scenarios[scenarioId]?.steps[entityId];

        if (step) {
            store.dispatch(
                deleteStep({
                    scenarioId,
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
            console.log('[ActivitySystemNodeContract]  Entity deleted');
        } else {
            console.warn(
                `[ActivitySystemNodeContract] ⚠️ Step ${entityId} not found for deletion`
            );
        }
    },
} as const;