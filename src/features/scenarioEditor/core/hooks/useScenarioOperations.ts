// src/features/scenarioEditor/core/hooks/useScenarioOperations.ts
// ОБНОВЛЕНИЕ: добавлен source tracking для избежания циклических обновлений

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
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
import { selectIsLocked } from '@scenario/core/features/lockSystem/lockSlice';

export function useScenarioOperations(scenarioId: Guid | null) {
    const isLocked = useSelector(selectIsLocked);
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
            if (isLocked) {
                console.warn('[useScenarioOperations] Operation blocked: scenario is locked');
                return null;
            }

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
        [scenarioId, history, toEntity, isLocked]
    );

    // ============================================================================
    // ПЕРЕМЕЩЕНИЕ НОДЫ С SOURCE TRACKING
    // ============================================================================

    const moveNode = useCallback(
        (node: FlowNode, newX: number, newY: number, childNodes?: FlowNode[]) => {
            if (isLocked) {
                console.warn('[useScenarioOperations] Move blocked: scenario is locked');
                return;
            }

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
            const newEntity = toEntity(newDto, node.type);
            const prevEntity = toEntity(previousDto, node.type);

            console.log('[useScenarioOperations] moveNode - previousDto:', previousDto);
            console.log('[useScenarioOperations] moveNode - newDto:', newDto);
            console.log('[useScenarioOperations] moveNode - prevEntity:', prevEntity);
            console.log('[useScenarioOperations] moveNode - newEntity:', newEntity);

            history.recordUpdate(newEntity, prevEntity);

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
            if (isLocked) {
                console.warn('[useScenarioOperations] Delete blocked: scenario is locked');
                return false;
            }

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

            const validation = contract?.validateOperation?.('delete', dto, {});
            if (validation && !validation.valid) {
                console.error('[useScenarioOperations] Delete validation failed:', validation.error);
                alert(validation.error);
                return false;
            }

            // ✅ ИСПРАВЛЕНИЕ: Используем batch для группировки удаления ноды и всех её связей
            // Это гарантирует, что при Undo все восстановится одной операцией

            // Получаем все связи, которые будут удалены вместе с нодой
            // ВАЖНО: scenarioSlice.deleteStep сам удалит эти связи из Redux,
            // нам нужно только записать их удаление в историю
            const state = store.getState();
            const scenarioState = state.scenario.scenarios[scenarioId];
            if (!scenarioState) {
                console.error(`[useScenarioOperations] Scenario ${scenarioId} not found in store`);
                return false;
            }
            const relationsToDelete = Object.values(scenarioState.relations).filter(
                (rel) => rel.parentStepId === node.id || rel.childStepId === node.id
            );

            // Если есть связи - используем batch
            if (relationsToDelete.length > 0) {
                console.log(`[useScenarioOperations] 🗑️ Deleting node with ${relationsToDelete.length} relations in batch`);

                history.startBatch();

                // ⚠️ НЕ вызываем stepRelationContract.deleteEntity()!
                // deleteStep в scenarioSlice сам удалит связи из Redux.
                // Мы только записываем удаление связей в историю для Undo/Redo и сохранения на сервер.
                for (const relation of relationsToDelete) {
                    history.recordDelete(toEntity(relation, 'StepRelation'));
                }

                // Удаляем ноду (deleteStep внутри contract.deleteEntity удалит и связи)
                contract.onBeforeDelete?.(dto);
                contract.deleteEntity(dto.id); // Это вызовет deleteStep, который удалит связи
                history.recordDelete(toEntity(dto, node.type));

                history.commitBatch(`Удаление ноды "${dto.name || node.id}" со связями`);
            } else {
                // Если связей нет - удаляем просто ноду
                console.log(`[useScenarioOperations] 🗑️ Deleting node without relations`);

                contract.onBeforeDelete?.(dto);
                contract.deleteEntity(dto.id);
                history.recordDelete(toEntity(dto, node.type));
            }

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

            // ✅ ИСПРАВЛЕНИЕ: При переносе ноды в другую ветку нужно удалить все её связи
            // Получаем все связи ДО переноса
            const state = store.getState();
            const scenarioState = state.scenario.scenarios[scenarioId];
            if (!scenarioState) {
                console.error(`[useScenarioOperations] Scenario ${scenarioId} not found in store`);
                return;
            }
            const relationsToDelete = Object.values(scenarioState.relations).filter(
                (rel) => rel.parentStepId === stepNode.id || rel.childStepId === stepNode.id
            );

            const newDto = contract.createAttachToBranchEntity(previousDto, branchId, newX, newY);

            // Если есть связи - используем batch для группировки переноса и удаления связей
            if (relationsToDelete.length > 0) {
                console.log(`[useScenarioOperations] 📌 Attaching step with ${relationsToDelete.length} relations in batch`);

                history.startBatch();

                // Удаляем все связи
                for (const relation of relationsToDelete) {
                    // Удаляем связь из Redux
                    stepRelationContract.deleteEntity(relation.id);
                    // Записываем удаление в историю
                    history.recordDelete(toEntity(relation, 'StepRelation'));
                }

                // Присоединяем ноду к новой ветке
                const newSnapshot = contract.createSnapshot(newDto);
                contract.applySnapshot(newSnapshot);
                history.recordUpdate(
                    toEntity(newDto, stepNode.type),
                    toEntity(previousDto, stepNode.type)
                );

                history.commitBatch(`Перенос ноды "${previousDto.name || stepNode.id}" в другую ветку`);
            } else {
                // Если связей нет - просто присоединяем
                console.log(`[useScenarioOperations] 📌 Attaching step without relations`);

                const newSnapshot = contract.createSnapshot(newDto);
                contract.applySnapshot(newSnapshot);
                history.recordUpdate(
                    toEntity(newDto, stepNode.type),
                    toEntity(previousDto, stepNode.type)
                );
            }

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

            // ✅ ИСПРАВЛЕНИЕ: При отсоединении ноды из ветки нужно удалить все её связи
            // Получаем все связи ДО отсоединения
            const state = store.getState();
            const scenarioState = state.scenario.scenarios[scenarioId];
            if (!scenarioState) {
                console.error(`[useScenarioOperations] Scenario ${scenarioId} not found in store`);
                return;
            }
            const relationsToDelete = Object.values(scenarioState.relations).filter(
                (rel) => rel.parentStepId === stepNode.id || rel.childStepId === stepNode.id
            );

            const newDto = contract.createDetachFromBranchEntity(previousDto, newX, newY);

            // Если есть связи - используем batch для группировки отсоединения и удаления связей
            if (relationsToDelete.length > 0) {
                console.log(`[useScenarioOperations] 🔓 Detaching step with ${relationsToDelete.length} relations in batch`);

                history.startBatch();

                // Записываем удаление всех связей в историю
                for (const relation of relationsToDelete) {
                    // Удаляем связь из Redux
                    stepRelationContract.deleteEntity(relation.id);
                    // Записываем удаление в историю
                    history.recordDelete(toEntity(relation, 'StepRelation'));
                }

                // Отсоединяем ноду от ветки
                const newSnapshot = contract.createSnapshot(newDto);
                contract.applySnapshot(newSnapshot);
                history.recordUpdate(
                    toEntity(newDto, stepNode.type),
                    toEntity(previousDto, stepNode.type)
                );

                history.commitBatch(`Отсоединение ноды "${previousDto.name || stepNode.id}" от ветки со связями`);
            } else {
                // Если связей нет - просто отсоединяем
                console.log(`[useScenarioOperations] 🔓 Detaching step without relations`);

                const newSnapshot = contract.createSnapshot(newDto);
                contract.applySnapshot(newSnapshot);
                history.recordUpdate(
                    toEntity(newDto, stepNode.type),
                    toEntity(previousDto, stepNode.type)
                );
            }

            console.log(`[useScenarioOperations] ✅ Step detached from branch: ${stepNode.id}`);

        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // АВТОМАТИЧЕСКОЕ РАСШИРЕНИЕ ВЕТКИ С SOURCE TRACKING
    // ============================================================================

    const autoExpandBranch = useCallback(
        (branchNode: FlowNode, newWidth: number, newHeight: number, newX?: number, newY?: number) => {
            // ⚠️ НЕ блокируем autoExpandBranch при isLocked, так как это автоматическая операция
            // которая не меняет логику сценария, а только визуальное представление

            if (!scenarioId) return;

            const contract = nodeTypeRegistry.get(branchNode.type);
            if (!contract?.createAutoExpandEntity) {
                console.warn(
                    `[useScenarioOperations] ${branchNode.type} doesn't support auto-expand`
                );
                return;
            }

            // ✅ ИСПРАВЛЕНО: Берем актуальные данные из Redux store, а не из branchNode.data.object
            // branchNode.data.object может быть устаревшим из-за асинхронности React updates
            const state = store.getState();
            const scenarioState = state.scenario.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[useScenarioOperations] Scenario ${scenarioId} not found in store`);
                return;
            }

            // ✅ ИСПРАВЛЕНО: Ветки хранятся в branches, а не в steps
            const previousDto = scenarioState.branches[branchNode.id];
            if (!previousDto) {
                console.error(`[useScenarioOperations] Branch ${branchNode.id} not found in store`);
                return;
            }

            // ✅ ИСПРАВЛЕНО: Проверяем, изменились ли размеры на самом деле
            const targetX = newX ?? previousDto.x;
            const targetY = newY ?? previousDto.y;

            const isSameSize =
                Math.round(previousDto.x) === Math.round(targetX) &&
                Math.round(previousDto.y) === Math.round(targetY) &&
                Math.round(previousDto.width) === Math.round(newWidth) &&
                Math.round(previousDto.height) === Math.round(newHeight);

            // Если размеры совпадают - пропускаем (нет смысла создавать запись в истории)
            if (isSameSize) {
                console.log(`[useScenarioOperations] ⏭️ Skipping auto-expand: sizes already match | ID: ${branchNode.id}`, {
                    current: { x: previousDto.x, y: previousDto.y, width: previousDto.width, height: previousDto.height },
                    target: { x: targetX, y: targetY, width: newWidth, height: newHeight }
                });
                return;
            }

            console.log(`[useScenarioOperations] 🔧 Branch auto-expand | ID: ${branchNode.id}`, {
                from: { x: previousDto.x, y: previousDto.y, width: previousDto.width, height: previousDto.height },
                to: { x: targetX, y: targetY, width: newWidth, height: newHeight }
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

            const newEntity = toEntity(newDto, branchNode.type);
            const prevEntity = toEntity(previousDto, branchNode.type);

            console.log('[useScenarioOperations] autoExpandBranch - previousDto:', previousDto);
            console.log('[useScenarioOperations] autoExpandBranch - newDto:', newDto);
            console.log('[useScenarioOperations] autoExpandBranch - prevEntity:', prevEntity);
            console.log('[useScenarioOperations] autoExpandBranch - newEntity:', newEntity);

            history.recordUpdate(newEntity, prevEntity);

            console.log(`[useScenarioOperations] ✅ Branch auto-expanded: ${branchNode.id}`);
        },
        [scenarioId, history, toEntity]
    );

    // ============================================================================
    // СОЗДАНИЕ НОДЫ (без source tracking — новая нода всегда external)
    // ============================================================================

    const createNode = useCallback(
        (node: FlowNode) => {
            if (isLocked) {
                console.warn('[useScenarioOperations] Create blocked: scenario is locked');
                return;
            }

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
        [scenarioId, history, toEntity, isLocked]
    );

    // ============================================================================
    // УДАЛЕНИЕ СВЯЗИ (RELATION)
    // ============================================================================

    const deleteRelation = useCallback(
        (relationId: Guid) => {
            if (isLocked) {
                console.warn('[useScenarioOperations] Delete relation blocked: scenario is locked');
                return;
            }

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

    // ============================================================================
    // УНИВЕРСАЛЬНОЕ ОБНОВЛЕНИЕ ENTITY (для редактирования через UI)
    // ============================================================================

    /**
     * Универсальный метод обновления entity (Step или Branch).
     * Используется для сохранения изменений из модальных окон редактирования.
     * Создает одну запись в истории с меткой 'user-edit' для важных изменений.
     *
     * @param node - Нода с обновленными данными
     * @param label - Метка для записи истории ('user-edit' для важных операций)
     */
    const updateEntity = useCallback(
        (node: FlowNode, label?: string) => {
            if (!scenarioId) {
                console.error('[useScenarioOperations] Cannot update: no scenarioId');
                return;
            }

            const contract = nodeTypeRegistry.get(node.type);
            if (!contract) {
                console.error(`[useScenarioOperations] No contract found for type: ${node.type}`);
                return;
            }

            const newDto = node.data.object;
            if (!newDto) {
                console.error('[useScenarioOperations] No DTO in node.data.object');
                return;
            }

            // Получаем старое состояние из Redux
            const state = store.getState();
            const scenarioState = state.scenario.scenarios[scenarioId];

            if (!scenarioState) {
                console.error(`[useScenarioOperations] Scenario ${scenarioId} not found`);
                return;
            }

            let previousDto: any;

            // Определяем откуда взять предыдущее состояние
            if (node.type === 'BranchNode') {
                previousDto = scenarioState.branches[node.id];
            } else {
                previousDto = scenarioState.steps[node.id];
            }

            if (!previousDto) {
                console.error(`[useScenarioOperations] Entity ${node.id} not found in store`);
                return;
            }

            console.log('[useScenarioOperations] 📝 Updating entity:', node.id, {
                type: node.type,
                previous: previousDto,
                new: newDto,
                label,
            });

            // Применяем изменения через snapshot
            const newSnapshot = contract.createSnapshot(newDto);
            contract.applySnapshot(newSnapshot);

            // Записываем в историю
            const newEntity = toEntity(newDto, node.type);
            const prevEntity = toEntity(previousDto, node.type);

            // Записываем с меткой если она указана
            if (label) {
                history.recordUpdate(newEntity, prevEntity, { label });
            } else {
                history.recordUpdate(newEntity, prevEntity);
            }

            console.log(`[useScenarioOperations] ✅ Entity updated: ${node.id}`);
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
        updateEntity,

        canUndo: history.canUndo,
        canRedo: history.canRedo,
        undo: history.undo,
        redo: history.redo,
        historySize: history.historySize,

        // Batching для массовых операций
        startBatch: history.startBatch,
        commitBatch: history.commitBatch,
        cancelBatch: history.cancelBatch,
    };
}