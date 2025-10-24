// src/features/scenarioEditor/core/hooks/useScenarioOperations.ts
// ОБНОВЛЕНИЕ: добавлен source tracking для избежания циклических обновлений

import { useCallback } from 'react';
import { useHistory } from '@scenario/core/features/historySystem/useHistory';
import { type Guid } from '@app/lib/types/Guid';
import { nodeTypeRegistry } from '@scenario/shared/contracts/registry/NodeTypeRegistry';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { Entity } from '@scenario/core/features/historySystem/types';
import type {
    StepRelationDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto.ts";
import { stepRelationContract } from "@scenario/core/ui/edges/StepRelationContract.ts";
import { store } from '@/baseStore/store';
import { updateStep } from '@scenario/store/scenarioSlice';

export function useScenarioOperations(scenarioId: Guid | null) {
    const history = useHistory(scenarioId ?? 'no-scenario', {
        autoInit: !!scenarioId,
        config: { maxHistorySize: 100, enableBatching: true },
    });

    const toEntity = useCallback((dto: any, entityType: string): Entity => {
        return {
            ...dto,
            id: dto.id,
            entityType,
        } as Entity;
    }, []);

    const createRelation = useCallback(
        (parentStepId: Guid, childStepId: Guid, conditionExpression?: string | null, conditionOrder?: number) => {
            if (!scenarioId) {
                console.error('[useScenarioOperations] Cannot create relation: no scenarioId');
                return null;
            }

            const validation = stepRelationContract.validateCreate({
                parentStepId,
                childStepId,
            });

            if (!validation.valid) {
                console.error('[useScenarioOperations] Relation validation failed:', validation.error);
                return null;
            }

            const relationDto: StepRelationDto = stepRelationContract.create({
                parentStepId,
                childStepId,
                conditionExpression,
                conditionOrder,
            } as StepRelationDto);

            const snapshot = stepRelationContract.createSnapshot(relationDto);
            stepRelationContract.createFromSnapshot(snapshot);

            history.recordCreate(toEntity(relationDto, 'StepRelation'));
            stepRelationContract.onCreated?.(relationDto);

            console.log(`[useScenarioOperations] ✅ Relation created: ${relationDto.id}`);

            return relationDto;
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // ПЕРЕМЕЩЕНИЕ НОДЫ С SOURCE TRACKING
    // ============================================================================

    const moveNode = useCallback(
        (node: FlowNode, newX: number, newY: number, childNodes?: FlowNode[]) => {
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


            // Применяем изменения через dispatch
            const newSnapshot = contract.createSnapshot(newDto);
            contract.applySnapshot(newSnapshot);

            // Записываем в историю
            history.recordUpdate(
                toEntity(newDto, node.type),
                toEntity(previousDto, node.type)
            );

            console.log(`[useScenarioOperations] ✅ Node moved: ${node.id}`, { newX, newY });

            // Если это ветка и есть дочерние ноды, обновляем их абсолютные координаты
            if (node.type === 'BranchNode' && childNodes && childNodes.length > 0) {
                const deltaX = newX - previousDto.x;
                const deltaY = newY - previousDto.y;

                console.log(
                    `[useScenarioOperations] 🔄 Updating ${childNodes.length} child steps | Delta: (${deltaX}, ${deltaY})`
                );

                const state = store.getState();
                const scenarioState = state.scenario.scenarios[scenarioId];

                if (!scenarioState) {
                    console.error(`[useScenarioOperations] Scenario ${scenarioId} not found when moving child steps`);
                    return;
                }

                childNodes.forEach((child) => {
                    const childContract = nodeTypeRegistry.get(child.type);
                    if (!childContract?.createMoveEntity) return;

                    const childDto = child.data.object;
                    if (!childDto) return;

                    // ПРОВЕРКА: Степ должен существовать в store перед обновлением
                    // Это защита от race condition, когда степ только что создан
                    if (!scenarioState.steps[childDto.id]) {
                        console.warn(
                            `[useScenarioOperations] ⚠️ Skipping move for non-existent step: ${childDto.id}`,
                            'Step not yet in store (race condition). Current coordinates:',
                            { x: childDto.x, y: childDto.y, deltaX, deltaY, target: { x: childDto.x + deltaX, y: childDto.y + deltaY } }
                        );
                        return;
                    }

                    console.log(`[useScenarioOperations] 📍 Moving child step: ${childDto.id}`, {
                        current: { x: childDto.x, y: childDto.y },
                        delta: { deltaX, deltaY },
                        target: { x: childDto.x + deltaX, y: childDto.y + deltaY }
                    });

                    const newChildX = childDto.x + deltaX;
                    const newChildY = childDto.y + deltaY;

                    const newChildDto = childContract.createMoveEntity(childDto, newChildX, newChildY);

                    // ИСПРАВЛЕНИЕ: Используем прямой dispatch вместо applySnapshot
                    // applySnapshot пытается найти scenarioId через store, что может не сработать
                    // для новосозданных степов. Используем уже известный scenarioId.
                    store.dispatch(
                        updateStep({
                            scenarioId,
                            stepId: childDto.id,
                            changes: newChildDto as any,
                        })
                    );

                    console.log(`[useScenarioOperations] ✅ Child step moved: ${child.id}`, { newChildX, newChildY });

                    // НЕ записываем в историю - это автоматическое следствие перемещения ветки
                });
            }

        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // РЕСАЙЗ НОДЫ С SOURCE TRACKING
    // ============================================================================

    const resizeNode = useCallback(
        (node: FlowNode, newWidth: number, newHeight: number, newX?: number, newY?: number) => {
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

            const newDto = contract.createResizeEntity(previousDto, newWidth, newHeight, newX, newY);

            const newSnapshot = contract.createSnapshot(newDto);
            contract.applySnapshot(newSnapshot);
            history.recordUpdate(toEntity(newDto, node.type), toEntity(previousDto, node.type));
            console.log(`[useScenarioOperations] ✅ Node resized: ${node.id}`, {
                newWidth, newHeight, newX: newX, newY: newY,
            });
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // УДАЛЕНИЕ НОДЫ (без source tracking — это всегда intentional)
    // ============================================================================

    const deleteNode = useCallback(
        (node: FlowNode) => {
            console.log('[ScenarioMap] 🗑️ Deleted:', node);

            if (!scenarioId){
                console.error('[ScenarioMap] scenarioId == false,  🗑️ Deleted:', node, scenarioId);
                return false;
            }

            if (node.data.__persisted !== true) {
                console.log(`[useScenarioOperations] ⚠️ Skipping delete for non-persisted node: ${node.id}`);
                return false;
            }

            const contract = nodeTypeRegistry.get(node.type);

            if(contract == undefined) throw Error('[useScenarioOperations] No DTO in node.data.object');

            const dto = node.data.object;
            if (!dto) return false;

            // СНАЧАЛА удаляем все связи этой ноды
            const state = store.getState();
            const scenarioState = state.scenario.scenarios[scenarioId];
            if (!scenarioState) {
                console.error(`[useScenarioOperations] Scenario ${scenarioId} not found in store`);
                return false;
            }
            const relationsToDelete = Object.values(scenarioState.relations).filter(
                (rel) => rel.parentStepId === node.id || rel.childStepId === node.id
            );

            if (relationsToDelete.length > 0) {
                console.log(`[useScenarioOperations] 🗑️ Deleting ${relationsToDelete.length} relations for node ${node.id}`);
                for (const relation of relationsToDelete) {
                    stepRelationContract.deleteEntity(relation.id);
                    history.recordDelete(toEntity(relation, 'StepRelation'));
                }
            }

            const validation = contract?.validateOperation?.('delete', dto, {});
            if (validation && !validation.valid) {
                console.error('[useScenarioOperations] Delete validation failed:', validation.error);
                alert(validation.error);
                return false;
            }

            contract.onBeforeDelete?.(dto);
            contract.deleteEntity(dto.id);

            history.recordDelete(toEntity(dto, node.type));

            console.log(`[useScenarioOperations] ✅ Node deleted: ${node.id}`);
            return true;
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // ПРИСОЕДИНЕНИЕ СТЕПА К ВЕТКЕ С SOURCE TRACKING
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

            const newSnapshot = contract.createSnapshot(newDto);
            contract.applySnapshot(newSnapshot);

            history.recordUpdate(
                toEntity(newDto, stepNode.type),
                toEntity(previousDto, stepNode.type)
            );

            console.log(`[useScenarioOperations] ✅ Step attached to branch: ${stepNode.id}`, {
                branchId,
            });

        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // ОТСОЕДИНЕНИЕ СТЕПА ОТ ВЕТКИ С SOURCE TRACKING
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

            const newSnapshot = contract.createSnapshot(newDto);
            contract.applySnapshot(newSnapshot);

            history.recordUpdate(
                toEntity(newDto, stepNode.type),
                toEntity(previousDto, stepNode.type)
            );

            console.log(`[useScenarioOperations] ✅ Step detached from branch: ${stepNode.id}`);

        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // АВТОМАТИЧЕСКОЕ РАСШИРЕНИЕ ВЕТКИ С SOURCE TRACKING
    // ============================================================================

    const autoExpandBranch = useCallback(
        (branchNode: FlowNode, newWidth: number, newHeight: number, newX?: number, newY?: number) => {
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

            console.log(`[useScenarioOperations] 🔧 Branch auto-expand | ID: ${branchNode.id}`, {
                from: { x: previousDto.x, y: previousDto.y, width: previousDto.width, height: previousDto.height },
                to: { x: newX ?? previousDto.x, y: newY ?? previousDto.y, width: newWidth, height: newHeight }
            });

            const newDto = contract.createAutoExpandEntity(previousDto, newWidth, newHeight, newX, newY);

            console.log(`[useScenarioOperations] 📦 New DTO created:`, {
                x: newDto.x,
                y: newDto.y,
                width: newDto.width,
                height: newDto.height
            });

            const newSnapshot = contract.createSnapshot(newDto);
            contract.applySnapshot(newSnapshot);

            history.recordUpdate(
                toEntity(newDto, branchNode.type),
                toEntity(previousDto, branchNode.type)
            );

            console.log(`[useScenarioOperations] ✅ Branch auto-expanded: ${branchNode.id}`);
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // СОЗДАНИЕ НОДЫ (без source tracking — новая нода всегда external)
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
            if (!contract) {
                console.error(`[useScenarioOperations] No contract found for type: ${node.type}`);
                return;
            }

            const snapshot = contract.createSnapshot(dto);
            contract.createFromSnapshot(snapshot);

            history.recordCreate(toEntity(dto, node.type));
            contract?.onCreated?.(dto);

            console.log(`[useScenarioOperations] ✅ Node created: ${node.id}`);
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // УДАЛЕНИЕ СВЯЗИ (RELATION)
    // ============================================================================

    const deleteRelation = useCallback(
        (relationId: Guid) => {
            if (!scenarioId) return;

            const state = store.getState();
            const scenarioState = state.scenario.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[useScenarioOperations] Scenario ${scenarioId} not found in store`);
                return;
            }

            const relation = scenarioState.relations[relationId];

            if (!relation) {
                console.warn(`[useScenarioOperations] Relation ${relationId} not found`);
                return;
            }

            console.log(`[useScenarioOperations] 🗑️ Deleting relation: ${relationId}`, relation);

            stepRelationContract.deleteEntity(relationId, scenarioId);
            history.recordDelete(toEntity(relation, 'StepRelation'));

            console.log(`[useScenarioOperations] ✅ Relation deleted: ${relationId}`);
        },
        [scenarioId, history, toEntity]
    );

    return {
        createRelation,
        deleteRelation,
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