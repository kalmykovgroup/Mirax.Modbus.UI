// src/features/scenarioEditor/core/ui/nodes/ActivityModbusNode/ActivityModbusNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { ActivityModbusStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';
import type { Guid } from '@app/lib/types/Guid';
import { store } from '@/baseStore/store';
import { updateStep, addStep, deleteStep } from '@scenario/store/scenarioSlice';
import { ActivityModbusNode } from './ActivityModbusNode';

export const ActivityModbusNodeContract: NodeTypeContract<ActivityModbusStepDto> = {
    // ============================================================================
    // БАЗОВЫЕ ПОЛЯ
    // ============================================================================

    type: FlowType.ActivityModbus,
    displayName: 'Действие с Modbus устройством',
    Component: ActivityModbusNode as any,

    // ============================================================================
    // МАППИНГ DTO ↔ Node
    // ============================================================================

    mapFromDto: (dto, parentId) => ({
        id: dto.id,
        type: FlowType.ActivityModbus,
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
        console.warn('[ActivityModbusNodeContract] Auto-expand not supported for steps', newWidth, newHeight, newX, newY);
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
                if (newWidth < 120 || newHeight < 80) {
                    return { valid: false, error: 'Минимальный размер: 120x80' };
                }
                return { valid: true };

            case 'attach':
                const { branchId } = params as { branchId: Guid };
                if (!branchId) {
                    return { valid: false, error: 'branchId не может быть пустым' };
                }
                return { valid: true };

            case 'detach':
                // Проверяем, что все необходимые ID установлены
                if (!dto.sessionId || !dto.connectionConfigId || !dto.modbusDeviceActionId) {
                    return {
                        valid: false,
                        error: 'Нельзя отсоединить Modbus действие без sessionId, connectionConfigId или modbusDeviceActionId',
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
        console.log(`[ActivityModbusNodeContract]  Created Modbus activity: ${dto.id}`, {
            name: dto.name,
            branchId: dto.branchId,
            sessionId: dto.sessionId,
            connectionConfigId: dto.connectionConfigId,
            modbusDeviceActionId: dto.modbusDeviceActionId,
            modbusDeviceAddressId: dto.modbusDeviceAddressId,
            position: { x: dto.x, y: dto.y },
        });

        // Проверяем, что все необходимые ID установлены
        const missingIds = [];
        if (!dto.sessionId) missingIds.push('sessionId');
        if (!dto.connectionConfigId) missingIds.push('connectionConfigId');
        if (!dto.modbusDeviceActionId) missingIds.push('modbusDeviceActionId');
        if (!dto.modbusDeviceAddressId) missingIds.push('modbusDeviceAddressId');

        if (missingIds.length > 0) {
            console.warn(
                `[ActivityModbusNodeContract] ⚠️ Modbus activity ${dto.id} created without: ${missingIds.join(', ')}`
            );
        }
    },

    onBeforeDelete: (dto) => {
        console.log(`[ActivityModbusNodeContract] 🗑️ Deleting Modbus activity: ${dto.id}`, dto);

        if (dto.childRelations && dto.childRelations.length > 0) {
            console.warn('[ActivityModbusNodeContract] Step has child relations, cleaning up...');
            // TODO: Удалить связи через Redux
        }

        if (dto.parentRelations && dto.parentRelations.length > 0) {
            console.warn('[ActivityModbusNodeContract] Step has parent relations, cleaning up...');
            // TODO: Удалить связи через Redux
        }
    },

    onUpdated: (previousDto, newDto) => {
        console.log(`[ActivityModbusNodeContract] 📝 Updated Modbus activity: ${newDto.id}`, {
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
                sessionId:
                    previousDto.sessionId !== newDto.sessionId
                        ? { from: previousDto.sessionId, to: newDto.sessionId }
                        : undefined,
                connectionConfigId:
                    previousDto.connectionConfigId !== newDto.connectionConfigId
                        ? { from: previousDto.connectionConfigId, to: newDto.connectionConfigId }
                        : undefined,
                modbusDeviceActionId:
                    previousDto.modbusDeviceActionId !== newDto.modbusDeviceActionId
                        ? { from: previousDto.modbusDeviceActionId, to: newDto.modbusDeviceActionId }
                        : undefined,
                modbusDeviceAddressId:
                    previousDto.modbusDeviceAddressId !== newDto.modbusDeviceAddressId
                        ? { from: previousDto.modbusDeviceAddressId, to: newDto.modbusDeviceAddressId }
                        : undefined,
            },
        });

        // Логика реакции на изменения Modbus конфигурации
        if (
            previousDto.sessionId !== newDto.sessionId ||
            previousDto.connectionConfigId !== newDto.connectionConfigId ||
            previousDto.modbusDeviceActionId !== newDto.modbusDeviceActionId ||
            previousDto.modbusDeviceAddressId !== newDto.modbusDeviceAddressId
        ) {
            console.log('[ActivityModbusNodeContract] Modbus configuration changed, updating...');
            // TODO: Обновить UI с новой информацией о Modbus устройстве
            // TODO: Валидировать новые ID
        }
    },

    // ============================================================================
    // МЕТОДЫ ИСТОРИИ
    // ============================================================================

    createSnapshot: (dto): EntitySnapshot<Entity> => {
        console.log('[ActivityModbusNodeContract] Creating snapshot for:', dto.id);

        return {
            entityId: dto.id,
            entityType: FlowType.ActivityModbus,
            data: {
                ...dto,
                entityType: FlowType.ActivityModbus,
            } as Entity,
            timestamp: Date.now(),
        };
    },

    applySnapshot: (snapshot) => {
        console.log('[ActivityModbusNodeContract] Applying snapshot (redo):', snapshot.entityId);

        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            updateStep({
                stepId: dto.id,
                changes: dto as any,
            })
        );

        console.log('[ActivityModbusNodeContract]  Snapshot applied');
    },

    revertSnapshot: (snapshot) => {
        console.log('[ActivityModbusNodeContract] Reverting snapshot (undo):', snapshot.entityId);

        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            updateStep({
                stepId: dto.id,
                changes: dto as any,
            })
        );

        console.log('[ActivityModbusNodeContract]  Snapshot reverted');
    },

    createFromSnapshot: (snapshot) => {
        console.log(
            '[ActivityModbusNodeContract] Creating step from snapshot:',
            snapshot.entityId
        );

        const { entityType, ...dto } = snapshot.data;

        store.dispatch(
            addStep({
                branchId: (dto as any).branchId,
                step: dto as any,
            })
        );

        console.log('[ActivityModbusNodeContract]  Step created from snapshot');
    },

    deleteEntity: (entityId) => {
        console.log('[ActivityModbusNodeContract] Deleting entity:', entityId);

        const state = store.getState();
        const step = state.scenario.steps[entityId];

        if (step) {
            store.dispatch(
                deleteStep({
                    branchId: step.branchId,
                    stepId: entityId,
                })
            );
            console.log('[ActivityModbusNodeContract]  Entity deleted');
        } else {
            console.warn(
                `[ActivityModbusNodeContract] ⚠️ Step ${entityId} not found for deletion`
            );
        }
    },
} as const;