// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useNodesChangeHandler.ts

import React, { useCallback } from 'react';
import { applyNodeChanges, type OnNodesChange } from '@xyflow/react';
import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import type { FlowStateRefs } from './useFlowState';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import { absOf } from '@scenario/core/utils/dropUtils';
import type {useScenarioOperations} from "@scenario/core/hooks/useScenarioOperations.ts";

interface UseNodesChangeHandlerParams {
    readonly refs: FlowStateRefs;
    readonly setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
    readonly operations: ReturnType<typeof useScenarioOperations>;
}

function hasChildren(nodeId: string, allNodes: FlowNode[]): boolean {
    return allNodes.some((n) => n.parentId === nodeId);
}

export function useNodesChangeHandler(params: UseNodesChangeHandlerParams): OnNodesChange<FlowNode> {
    const { refs, setNodes, operations } = params;
    const {
        nodesRef,
        dragStateRef,
        resizeStateRef,
        isDraggingRef,
        isDraggingBranchRef,
        pendingBranchResizeRef,
        skipSyncRef,
        draggingParentIdsRef,
        isBatchMoveRef,
    } = refs;

    return useCallback((changes) => {
        // Обнаруживаем parent ноды в drag
        for (const change of changes) {
            if (change.type === 'position' && 'dragging' in change) {
                const node = nodesRef.current?.find((n) => n.id === change.id);

                if (change.dragging === true) {
                    if (node && (node.type === FlowType.BranchNode || hasChildren(node.id, nodesRef.current ?? []))) {
                        draggingParentIdsRef.current?.add(change.id);
                    }
                } else if (change.dragging === false) {
                    draggingParentIdsRef.current?.delete(change.id);
                }
            }
        }

        // Фильтруем position changes детей во время drag parent
        const filteredChanges = changes.filter((change) => {
            if (change.type !== 'position') return true;

            const node = nodesRef.current?.find((n) => n.id === change.id);
            if (node == null) return true;

            if (node.parentId && draggingParentIdsRef.current?.has(node.parentId)) {
                return false;
            }

            return true;
        });

        const filtered = changes.length - filteredChanges.length;
        if (filtered > 0) {
            console.log(`[NodesChange] 🚀 Performance boost: filtered ${filtered}/${changes.length} updates`);
        }


        setNodes((nds) => applyNodeChanges(filteredChanges, nds) as FlowNode[]);

        // ============================================================================
        // БАТЧИНГ: Определяем по размеру dragStateRef при первом dragEnd
        // ============================================================================
        const dragEndChanges = filteredChanges.filter(
            (change): change is typeof change & { dragging: false; position: { x: number; y: number } } =>
                change.type === 'position' &&
                'dragging' in change &&
                change.dragging === false &&
                'position' in change &&
                change.position != null
        );

        // Проверяем: если есть dragEnd события И dragStateRef содержит >1 записей - это батч
        const hasBatchMove = dragEndChanges.length > 0 && (dragStateRef.current?.size ?? 0) > 1;

        if (hasBatchMove && !isBatchMoveRef.current) {
            console.log(`[NodesChange] 🔄 Starting batch (dragState size: ${dragStateRef.current?.size ?? 0})`);
            if (isBatchMoveRef.current != null) {
                isBatchMoveRef.current = true;
            }
            operations.startBatch();
        }

        for (const change of filteredChanges) {
            if (change.type === 'position' && 'position' in change && change.position != null) {
                const { id, dragging } = change;

                if (dragging === true) {
                    if (dragStateRef.current && !dragStateRef.current.has(id)) {
                        const node = nodesRef.current?.find((n) => n.id === id);
                        if (node) {
                            // ВАЖНО: Сохраняем АБСОЛЮТНЫЕ координаты для корректного сравнения
                            const absPos = absOf(node, nodesRef.current ?? []);
                            dragStateRef.current.set(id, {
                                x: Math.round(absPos.x),
                                y: Math.round(absPos.y),
                            });

                            const isBranch = node.type === 'BranchNode';
                            if (isDraggingRef.current != null) {
                                isDraggingRef.current = true;
                            }
                            if (isBranch && isDraggingBranchRef.current != null) {
                                isDraggingBranchRef.current = true;
                            }

                            if (skipSyncRef.current != null) {
                                skipSyncRef.current = true;
                            }

                            console.log(`[NodesChange] 🚀 DRAG START | Type: ${node.type} | ID: ${id}`, {
                                absolute: absPos,
                                relative: node.position,
                                hasParent: !!node.parentId,
                            });
                        }
                    }
                } else if (dragging === false) {
                    if (isDraggingRef.current != null) {
                        isDraggingRef.current = false;
                    }
                    if (isDraggingBranchRef.current != null) {
                        isDraggingBranchRef.current = false;
                    }5

                    const startPos = dragStateRef.current?.get(id);
                    const node = nodesRef.current?.find((n) => n.id === id);

                    // Сохраняем позицию ЛЮБОЙ ноды после перемещения
                    if (node && startPos) {
                        const updatedNode: FlowNode = {
                            ...node,
                            position: {
                                x: Math.round(change.position.x),
                                y: Math.round(change.position.y),
                            },
                        };

                        const absPos = absOf(updatedNode, nodesRef.current ?? []);
                        const newX = Math.round(absPos.x);
                        const newY = Math.round(absPos.y);

                        if (startPos.x !== newX || startPos.y !== newY) {
                            // ✅ ИСПРАВЛЕНО: Используем флаг isBatchMoveRef вместо проверки size
                            // При одиночном перемещении NodeDragStopHandler обрабатывает все через callbacks
                            const isBatch = isBatchMoveRef.current === true;

                            if (isBatch) {
                                if (node.type === FlowType.BranchNode) {
                                    console.log(
                                        `[NodesChange] 📍 BATCH BRANCH MOVED | ID: ${id}`,
                                        { from: startPos, to: { x: newX, y: newY } }
                                    );

                                    const childSteps = nodesRef.current?.filter((n) => n.parentId === id) ?? [];
                                    operations.moveNode(node, newX, newY, childSteps);
                                } else {
                                    console.log(
                                        `[NodesChange] 📍 BATCH STEP MOVED | Type: ${node.type} | ID: ${id}`,
                                        {
                                            from: startPos,
                                            to: { x: newX, y: newY },
                                            relative: { x: updatedNode.position.x, y: updatedNode.position.y },
                                            hasParent: !!node.parentId,
                                        }
                                    );

                                    operations.moveNode(node, newX, newY);
                                }
                            } else {
                                console.log(
                                    `[NodesChange] 📍 SINGLE DRAG END | Type: ${node.type} | ID: ${id}`,
                                    {
                                        from: startPos,
                                        to: { x: newX, y: newY },
                                        relative: { x: updatedNode.position.x, y: updatedNode.position.y },
                                        hasParent: !!node.parentId,
                                    }
                                );
                                // NodeDragStopHandler обработает через onStepMoved callback
                            }
                        }
                    }

                    dragStateRef.current?.delete(id);

                    if (pendingBranchResizeRef.current) {
                        for (const [branchId, resize] of pendingBranchResizeRef.current.entries()) {
                            const branchNode = nodesRef.current?.find((n) => n.id === branchId);
                            if (branchNode) {
                                operations.autoExpandBranch(
                                    branchNode,
                                    resize.to.width,
                                    resize.to.height
                                );
                            }
                        }
                        pendingBranchResizeRef.current.clear();
                    }

                    setTimeout(() => {
                        if (skipSyncRef.current != null) {
                            skipSyncRef.current = false;
                        }
                        console.log('[NodesChange] ✅ Drag completed, sync re-enabled');
                    }, 100);
                }
            }

            if (change.type === 'dimensions' && 'dimensions' in change && change.dimensions != null) {
                const { id, dimensions, resizing } = change;

                if (resizing === true) {
                    if (resizeStateRef.current && !resizeStateRef.current.has(id)) {
                        const node = nodesRef.current?.find((n) => n.id === id);
                        if (node) {
                            const currentWidth =
                                typeof node.style?.width === 'number'
                                    ? node.style.width
                                    : node.measured?.width ?? 0;

                            const currentHeight =
                                typeof node.style?.height === 'number'
                                    ? node.style.height
                                    : node.measured?.height ?? 0;

                            if (currentWidth > 0 && currentHeight > 0) {
                                resizeStateRef.current.set(id, {
                                    width: Math.round(currentWidth),
                                    height: Math.round(currentHeight),
                                });
                                console.log(`[NodesChange] 🔄 RESIZE START | ID: ${id}`, {
                                    width: currentWidth,
                                    height: currentHeight,
                                });
                            }
                        }
                    }
                } else if (resizing === false) {
                    const startState = resizeStateRef.current?.get(id);
                    const newWidth = Math.round(dimensions.width);
                    const newHeight = Math.round(dimensions.height);

                    if (
                        startState != null &&
                        (startState.width !== newWidth || startState.height !== newHeight)
                    ) {
                        const node = nodesRef.current?.find((n) => n.id === id);
                        if (node) {
                            console.log(`[NodesChange] ✅ RESIZE END | ID: ${id}`, {
                                from: startState,
                                to: { width: newWidth, height: newHeight },
                            });
                            operations.resizeNode(node, newWidth, newHeight);
                        }
                    }
                    resizeStateRef.current?.delete(id);
                }
            }

            if (change.type === 'select') {
                const node = nodesRef.current?.find((n) => n.id === change.id);
                console.log(
                    `[NodesChange] 🎯 NODE ${change.selected ? 'SELECTED' : 'DESELECTED'} | Type: ${
                        node?.type ?? 'unknown'
                    } | ID: ${change.id}`
                );
            }
        }

        // ============================================================================
        // БАТЧИНГ: Фиксируем батч только когда ВСЕ ноды закончили перемещение
        // ============================================================================
        // Проверяем: если был батч И dragStateRef теперь пуст - коммитим
        if (isBatchMoveRef.current && (dragStateRef.current?.size ?? 0) === 0) {
            console.log(`[NodesChange] ✅ All nodes finished moving, committing batch`);

            // Коммитим батч
            // Автоматическое расширение веток теперь делает сам BranchNode через useEffect
            operations.commitBatch('Массовое перемещение нод');

            // Сбрасываем флаг батчинга
            if (isBatchMoveRef.current != null) {
                isBatchMoveRef.current = false;
            }
        }
    }, [setNodes, operations, refs, nodesRef, dragStateRef, resizeStateRef, isDraggingRef, isDraggingBranchRef, pendingBranchResizeRef, skipSyncRef, draggingParentIdsRef, isBatchMoveRef]);
}