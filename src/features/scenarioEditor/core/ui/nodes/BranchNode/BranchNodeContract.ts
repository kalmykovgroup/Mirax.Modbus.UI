// src/features/scenarioEditor/core/ui/nodes/BranchNode/BranchNodeContract.ts

import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import type { EntitySnapshot, Entity } from '@scenario/core/features/historySystem/types';

import { store } from '@/baseStore/store';
import { updateBranch, addBranch, deleteBranch, findScenarioIdByBranchId } from '@scenario/store/scenarioSlice';
import { BranchNode } from './BranchNode';
import { ctrlKeyStore } from '@app/lib/hooks/ctrlKeyStore';

export const BranchNodeContract: NodeTypeContract<BranchDto> = {
    type: FlowType.BranchNode,
    displayName: 'Ветка',
    Component: BranchNode as any,

    canHaveChildBranches: true,

    mapFromDto: (dto, parentId) => {
        // Проверяем состояние Ctrl при создании ноды
        const isCtrlPressed = ctrlKeyStore.get();

        const node: any = {
            id: dto.id,
            type: FlowType.BranchNode,
            position: { x: dto.x, y: dto.y },
            data: { object: dto, x: dto.x, y: dto.y, __persisted: true },
            style: { width: dto.width, height: dto.height },
            parentId,
            // Изначально BranchNode неактивна для перетаскивания и выбора
            draggable: isCtrlPressed,
            selectable: isCtrlPressed,
            resizable: false,   // Только автоматическое расширение
            expandParent: true,
        };

        return node;
    },

    mapToDto: (node) => node.data.object,

    // ============================================================================
    // ОПЕРАЦИИ
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

    createAutoExpandEntity: (dto, newWidth, newHeight, newX, newY) => ({
        ...dto,
        x: newX ?? dto.x,
        y: newY ?? dto.y,
        width: newWidth,
        height: newHeight,
    }),

    createAttachToBranchEntity: (dto, branchId, newX, newY) => {
        // Ветки не присоединяются к другим веткам
        console.warn('[BranchNodeContract] Branches cannot be attached to other branches', branchId, newX, newY);
        return dto;
    },

    createDetachFromBranchEntity: (dto, newX, newY) => {
        console.warn('[BranchNodeContract] Branches cannot be detached', newX, newY);
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

            case 'move':
                // Проверяем, что Ctrl нажат при попытке перемещения
                const isCtrlPressed = ctrlKeyStore.get();
                if (!isCtrlPressed) {
                    return {
                        valid: false,
                        error: 'Для перемещения ветки нажмите Ctrl',
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
        console.log(`[BranchNodeContract] 📝 Updated branch: ${newDto.id}`, previousDto, newDto);
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
        const state = store.getState();
        const scenarioId = findScenarioIdByBranchId(state.scenario, dto.id);

        if (!scenarioId) {
            console.error(`[BranchNodeContract] Scenario not found for branch ${dto.id}`);
            return;
        }

        store.dispatch(
            updateBranch({
                scenarioId,
                branchId: dto.id,
                changes: dto as any,
            })
        );
    },

    revertSnapshot: (snapshot) => {
        const { entityType, ...dto } = snapshot.data;
        const state = store.getState();
        const scenarioId = findScenarioIdByBranchId(state.scenario, dto.id);

        if (!scenarioId) {
            console.error(`[BranchNodeContract] Scenario not found for branch ${dto.id}`);
            return;
        }

        store.dispatch(
            updateBranch({
                scenarioId,
                branchId: dto.id,
                changes: dto as any,
            })
        );
    },

    createFromSnapshot: (snapshot) => {
        const { entityType, ...dto } = snapshot.data;
        const scenarioId = (dto as any).scenarioId;

        if (!scenarioId) {
            console.error(`[BranchNodeContract] scenarioId not found in snapshot data`);
            return;
        }

        store.dispatch(
            addBranch({
                scenarioId,
                branch: dto as any,
                parentStepId: (dto as any).parallelStepId ?? (dto as any).conditionStepId ?? null,
            })
        );
    },

    deleteEntity: (entityId) => {
        const state = store.getState();
        const scenarioId = findScenarioIdByBranchId(state.scenario, entityId);

        if (!scenarioId) {
            console.error(`[BranchNodeContract] Scenario not found for branch ${entityId}`);
            return;
        }

        store.dispatch(deleteBranch({ scenarioId, branchId: entityId }));
    },
} as const;