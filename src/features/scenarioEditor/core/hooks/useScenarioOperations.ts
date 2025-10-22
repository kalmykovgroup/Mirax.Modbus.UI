// src/features/scenarioEditor/core/hooks/useScenarioOperations.ts

import { useCallback } from 'react';
import { useHistory } from '@scenario/core/features/historySystem/useHistory';
import type { Guid } from '@app/lib/types/Guid';
import { nodeTypeRegistry } from '@scenario/shared/contracts/registry/NodeTypeRegistry';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { Entity } from '@scenario/core/features/historySystem/types';

export function useScenarioOperations(scenarioId: Guid | null) {
    const history = useHistory(scenarioId ?? 'no-scenario', {
        autoInit: !!scenarioId,
        config: { maxHistorySize: 100, enableBatching: true },
    });

    // ============================================================================
    // HELPER: Преобразовать DTO в Entity (добавить entityType)
    // ============================================================================

    const toEntity = useCallback((dto: any, entityType: string): Entity => {
        return {
            ...dto,
            id: dto.id,
            entityType,
        } as Entity;
    }, []);

    // ============================================================================
    // ПЕРЕМЕЩЕНИЕ НОДЫ
    // ============================================================================

    const moveNode = useCallback(
        (node: FlowNode, newX: number, newY: number) => {
            if (!scenarioId) return;

            const contract = nodeTypeRegistry.get(node.type);
            if (!contract?.createMoveEntity) {
                console.warn(`[useScenarioOperations] ${node.type} doesn't support move`);
                return;
            }

            const previousDto = node.data.object;
            if (!previousDto) {
                console.error('[useScenarioOperations] No DTO in node.data.object');
                return;
            }

            const validation = contract.validateOperation?.('move', previousDto, { newX, newY });
            if (validation && !validation.valid) {
                console.error('[useScenarioOperations] Move validation failed:', validation.error);
                return;
            }

            const newDto = contract.createMoveEntity(previousDto, newX, newY);

            //  Преобразуем DTO в Entity (добавляем entityType из contract.type)
            history.recordUpdate(
                toEntity(newDto, node.type),
                toEntity(previousDto, node.type)
            );

            console.log(`[useScenarioOperations]  Node moved: ${node.id}`, { newX, newY });
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // РЕСАЙЗ НОДЫ
    // ============================================================================

    const resizeNode = useCallback(
        (node: FlowNode, newWidth: number, newHeight: number) => {
            if (!scenarioId) return;

            const contract = nodeTypeRegistry.get(node.type);
            if (!contract?.createResizeEntity) {
                console.warn(`[useScenarioOperations] ${node.type} doesn't support resize`);
                return;
            }

            const previousDto = node.data.object;
            if (!previousDto) return;

            const validation = contract.validateOperation?.('resize', previousDto, {
                newWidth,
                newHeight,
            });
            if (validation && !validation.valid) {
                console.error('[useScenarioOperations] Resize validation failed:', validation.error);
                return;
            }

            const newDto = contract.createResizeEntity(previousDto, newWidth, newHeight);

            history.recordUpdate(
                toEntity(newDto, node.type),
                toEntity(previousDto, node.type)
            );

            console.log(`[useScenarioOperations]  Node resized: ${node.id}`, {
                newWidth,
                newHeight,
            });
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // УДАЛЕНИЕ НОДЫ
    // ============================================================================

    const deleteNode = useCallback(
        (node: FlowNode) => {
            if (!scenarioId) return;

            const contract = nodeTypeRegistry.get(node.type);
            const dto = node.data.object;
            if (!dto) return;

            const validation = contract?.validateOperation?.('delete', dto, {});
            if (validation && !validation.valid) {
                console.error('[useScenarioOperations] Delete validation failed:', validation.error);
                alert(validation.error);
                return false;
            }

            contract?.onBeforeDelete?.(dto);

            history.recordDelete(toEntity(dto, node.type));

            console.log(`[useScenarioOperations]  Node deleted: ${node.id}`);
            return true;
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // ПРИСОЕДИНЕНИЕ СТЕПА К ВЕТКЕ
    // ============================================================================

    const attachStepToBranch = useCallback(
        (stepNode: FlowNode, branchId: Guid, newX: number, newY: number) => {
            if (!scenarioId) return;

            const contract = nodeTypeRegistry.get(stepNode.type);
            if (!contract?.createAttachToBranchEntity) {
                console.warn(
                    `[useScenarioOperations] ${stepNode.type} doesn't support attach`
                );
                return;
            }

            const previousDto = stepNode.data.object;
            if (!previousDto) return;

            const validation = contract.validateOperation?.('attach', previousDto, {
                branchId,
                newX,
                newY,
            });
            if (validation && !validation.valid) {
                console.error(
                    '[useScenarioOperations] Attach validation failed:',
                    validation.error
                );
                return;
            }

            const newDto = contract.createAttachToBranchEntity(previousDto, branchId, newX, newY);

            history.recordUpdate(
                toEntity(newDto, stepNode.type),
                toEntity(previousDto, stepNode.type)
            );

            console.log(`[useScenarioOperations]  Step attached to branch: ${stepNode.id}`, {
                branchId,
            });
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // ОТСОЕДИНЕНИЕ СТЕПА ОТ ВЕТКИ
    // ============================================================================

    const detachStepFromBranch = useCallback(
        (stepNode: FlowNode, newX: number, newY: number) => {
            if (!scenarioId) return;

            const contract = nodeTypeRegistry.get(stepNode.type);
            if (!contract?.createDetachFromBranchEntity) {
                console.warn(
                    `[useScenarioOperations] ${stepNode.type} doesn't support detach`
                );
                return;
            }

            const previousDto = stepNode.data.object;
            if (!previousDto) return;

            const validation = contract.validateOperation?.('detach', previousDto, {
                newX,
                newY,
            });
            if (validation && !validation.valid) {
                console.error(
                    '[useScenarioOperations] Detach validation failed:',
                    validation.error
                );
                return;
            }

            const newDto = contract.createDetachFromBranchEntity(previousDto, newX, newY);

            history.recordUpdate(
                toEntity(newDto, stepNode.type),
                toEntity(previousDto, stepNode.type)
            );

            console.log(`[useScenarioOperations]  Step detached from branch: ${stepNode.id}`);
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // АВТОМАТИЧЕСКОЕ РАСШИРЕНИЕ ВЕТКИ
    // ============================================================================

    const autoExpandBranch = useCallback(
        (branchNode: FlowNode, newWidth: number, newHeight: number) => {
            if (!scenarioId) return;

            const contract = nodeTypeRegistry.get(branchNode.type);
            if (!contract?.createAutoExpandEntity) {
                console.warn(
                    `[useScenarioOperations] ${branchNode.type} doesn't support auto-expand`
                );
                return;
            }

            const previousDto = branchNode.data.object;
            if (!previousDto) return;

            const newDto = contract.createAutoExpandEntity(previousDto, newWidth, newHeight);

            history.recordUpdate(
                toEntity(newDto, branchNode.type),
                toEntity(previousDto, branchNode.type)
            );

            console.log(`[useScenarioOperations]  Branch auto-expanded: ${branchNode.id}`, {
                newWidth,
                newHeight,
            });
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // СОЗДАНИЕ НОДЫ
    // ============================================================================

    const createNode = useCallback(
        (node: FlowNode) => {
            if (!scenarioId) return;

            const dto = node.data.object;
            if (!dto) {
                console.error('[useScenarioOperations] No DTO in node.data.object');
                return;
            }

            const contract = nodeTypeRegistry.get(node.type);
            contract?.onCreated?.(dto);

            history.recordCreate(toEntity(dto, node.type));

            console.log(`[useScenarioOperations]  Node created: ${node.id}`);
        },
        [scenarioId, history, toEntity]
    );

    return {
        moveNode,
        resizeNode,
        deleteNode,
        attachStepToBranch,
        detachStepFromBranch,
        autoExpandBranch,
        createNode,

        canUndo: history.canUndo,
        canRedo: history.canRedo,
        undo: history.undo,
        redo: history.redo,
        historySize: history.historySize,
    };
}