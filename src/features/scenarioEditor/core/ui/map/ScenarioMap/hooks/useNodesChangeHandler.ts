// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useNodesChangeHandler.ts

import React, { useCallback } from 'react';
import { applyNodeChanges, type OnNodesChange } from '@xyflow/react';
import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import type { FlowStateRefs } from './useFlowState';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';

interface UseNodesChangeHandlerParams {
    readonly refs: FlowStateRefs;
    readonly setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
    readonly operations: ReturnType<typeof import('@scenario/core/hooks/useScenarioOperations').useScenarioOperations>;
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

        for (const change of filteredChanges) {
            if (change.type === 'position' && 'position' in change && change.position != null) {
                const { id, dragging } = change;

                if (dragging === true) {
                    if (dragStateRef.current && !dragStateRef.current.has(id)) {
                        const node = nodesRef.current?.find((n) => n.id === id);
                        if (node) {
                            dragStateRef.current.set(id, {
                                x: Math.round(node.position.x),
                                y: Math.round(node.position.y),
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

                            console.log(`[NodesChange] 🚀 DRAG START | Type: ${node.type} | ID: ${id}`);
                        }
                    }
                } else if (dragging === false) {
                    if (isDraggingRef.current != null) {
                        isDraggingRef.current = false;
                    }
                    if (isDraggingBranchRef.current != null) {
                        isDraggingBranchRef.current = false;
                    }

                    const startPos = dragStateRef.current?.get(id);
                    const node = nodesRef.current?.find((n) => n.id === id);

                    // Сохраняем позицию ветки после перемещения
                    if (node && node.type === FlowType.BranchNode && startPos) {
                        const newX = Math.round(change.position.x);
                        const newY = Math.round(change.position.y);

                        if (startPos.x !== newX || startPos.y !== newY) {
                            console.log(
                                `[NodesChange] 📍 BRANCH MOVED | ID: ${id}`,
                                { from: startPos, to: { x: newX, y: newY } }
                            );

                            // Найти все дочерние степы этой ветки
                            const childSteps = nodesRef.current?.filter((n) => n.parentId === id) ?? [];

                            operations.moveNode(node, newX, newY, childSteps);
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
    }, [setNodes, operations, refs, nodesRef, dragStateRef, resizeStateRef, isDraggingRef, isDraggingBranchRef, pendingBranchResizeRef, skipSyncRef, draggingParentIdsRef]);
}