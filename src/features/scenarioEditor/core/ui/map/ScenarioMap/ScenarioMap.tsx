// src/features/scenarioEditor/core/ui/map/ScenarioMap/ScenarioMap.tsx
// ИСПРАВЛЕНИЕ: умная синхронизация Redux → ReactFlow без скачков при drag

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Background,
    BackgroundVariant,
    ConnectionLineType,
    Controls,
    type OnEdgesChange,
    type OnNodesChange,
    type OnSelectionChangeParams,
    MarkerType,
    Panel,
    ReactFlow,
    SelectionMode,
    applyNodeChanges,
    applyEdgeChanges,
    useReactFlow, type Connection, addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {useSelector} from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';

import styles from './ScenarioMap.module.css';

import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { edgeTypes } from '@scenario/core/ui/nodes/types/edgeTypes';

import { RightPanel } from '@scenario/core/ui/map/RightPanel/RightPanel';
import LeftPanel from '@scenario/core/ui/map/LeftPanel/LeftPanel';

import type { RootState } from '@/baseStore/store';

import { useTheme } from '@app/providers/theme/useTheme';
import { mapScenarioToFlow } from '@scenario/core/mapScenarioToFlow';

import { selectActiveScenarioId } from '@scenario/store/scenarioSelectors';
import { generateNodeTypes } from '@scenario/core/utils/generateNodeTypes';
import { useSelection } from '@scenario/core/hooks/useSelection';
import { NodeDragStopHandler } from '@scenario/core/handlers/NodeDragStopHandler';
import {
    absOf,
    rectOf,
    ensureParentBeforeChild,
    pickDeepestBranchByTopLeft,
} from '@scenario/core/utils/dropUtils';
import { isAnyBranchResizing } from '@scenario/core/ui/nodes/BranchNode/branchResizeGuard.ts';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import {useScenarioOperations} from "@scenario/core/hooks/useScenarioOperations.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import {useConnectContext} from "@scenario/core/hooks/useConnectContext.ts";
import {useEdgesRef, useIsValidConnection} from "@scenario/core/hooks/useConnectionValidation.ts";
import {createIsValidConnection} from "@scenario/core/edgeMove/isValidConnection.ts";
import {ALLOW_MAP, TARGET_ALLOW_MAP} from "@scenario/core/edgeMove/connectionRules.ts";
import {NodeDragStartHandler} from "@scenario/core/handlers/NodeDragStartHandler.ts";
import {useShiftKey} from "@app/lib/hooks/useShiftKey.ts";
import {updateSourceTracker} from "@scenario/store/updateSourceTracker.ts";

export interface ScenarioEditorProps {}

interface DragState {
    readonly x: number;
    readonly y: number;
}

interface ResizeState {
    readonly width: number;
    readonly height: number;
}

const makeSelectScenarioData = () =>
    createSelector(
        [
            (state: RootState) => state.scenario.scenarios,
            (state: RootState) => state.scenario.branches,
            (state: RootState) => state.scenario.steps,
            (state: RootState) => state.scenario.relations,
            (_: RootState, scenarioId: string | null) => scenarioId,
        ],
        (scenarios, branches, steps, relations, scenarioId) => {
            if (scenarioId == null) return null;
            const scenario = scenarios[scenarioId];
            if (scenario == null) return null;
            return { scenario, branches, steps, relations };
        }
    );

export const ScenarioMap: React.FC<ScenarioEditorProps> = () => {
    const { theme } = useTheme();

    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [edges, setEdges] = useState<FlowEdge[]>([]);
    const [_hoverBranch, setHoverBranch] = useState<string | undefined>();

    const dragStateRef = useRef<Map<string, DragState>>(new Map());
    const resizeStateRef = useRef<Map<string, ResizeState>>(new Map());
    const branchSizesRef = useRef<Map<string, ResizeState>>(new Map());
    const nodesRef = useRef<FlowNode[]>([]);
    const resizeObserversRef = useRef<Map<string, ResizeObserver>>(new Map());

    // Отслеживание активного dragging
    const isDraggingRef = useRef<boolean>(false);
    const isDraggingBranchRef = useRef<boolean>(false);
    const pendingBranchResizeRef = useRef<Map<string, { from: ResizeState; to: ResizeState }>>(
        new Map()
    );

    // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: флаг для пропуска синхронизации во время drag
    const skipSyncRef = useRef<boolean>(false);

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    const nodeTypes = useMemo(() => generateNodeTypes(), []);

    const activeId = useSelector(selectActiveScenarioId);
    const operations = useScenarioOperations(activeId);

    const selectScenarioData = useMemo(() => makeSelectScenarioData(), []);
    const scenarioData = useSelector((state: RootState) =>
        selectScenarioData(state, activeId)
    );

    const rf = useReactFlow<FlowNode, FlowEdge>();

    const { onConnectStart, onConnectEnd, getNodeType } = useConnectContext({
        rf,
        setNodes,
    });

    const shiftDragIdsRef = useRef<Set<string>>(new Set());
    const isShiftPressed = useShiftKey();

    useEffect(() => {
        nodes
            .filter(n => n.parentId && n.type !== FlowType.BranchNode)
            .forEach(n => {
                const targetExtent = isShiftPressed ? undefined : ('parent' as const);
                const targetExpandParent = !isShiftPressed;

                if (n.extent !== targetExtent || n.expandParent !== targetExpandParent) {
                    rf.updateNode(n.id, {
                        extent: targetExtent,
                        expandParent: targetExpandParent,
                    } as FlowNode);
                }
            });
    }, [isShiftPressed, nodes, rf]);

    const dragStartHandler = useMemo(
        () =>
            new NodeDragStartHandler({
                shiftDragIdsRef,
            }),
        []
    );

    const { onSelectionChange, deleteSelected } = useSelection({
        setNodes,
        setEdges,
        getNodes: rf.getNodes,
        getEdges: rf.getEdges,
        onDeleted: (payload) => {
            console.log('[ScenarioMap] 🗑️ Deleted:', payload);

            for (const node of payload.nodes) {
                if (node.data.__persisted === true) {
                    operations.deleteNode(node);
                }
            }
        },
    });

    const dragStopHandler = useMemo(
        () =>
            new NodeDragStopHandler({
                getAll: rf.getNodes,
                getAllEdges: rf.getEdges,
                setNodes,
                setEdges,
                setHoverBranch,
                shiftDragIdsRef,
                utils: {
                    absOf,
                    rectOf,
                    ensureParentBeforeChild,
                    pickDeepestBranchByTopLeft,
                    isAnyBranchResizing,
                },
                callbacks: {
                    onStepMoved: (stepId, x, y) => {
                        console.log(`[ScenarioMap] 📍 STEP MOVED | ID: ${stepId}`, { x, y });
                        const stepNode = rf.getNodes().find((n) => n.id === stepId);
                        if (stepNode) {
                            operations.moveNode(stepNode, x, y);
                        }
                    },
                    onStepAttachedToBranch: (stepId, branchId, x, y) => {
                        console.log(
                            `[ScenarioMap] 🔗 STEP ATTACHED TO BRANCH | Step: ${stepId} | Branch: ${branchId}`,
                            { x, y }
                        );
                        const stepNode = rf.getNodes().find((n) => n.id === stepId);
                        if (stepNode) {
                            operations.attachStepToBranch(stepNode, branchId, x, y);
                        }
                    },
                    onStepDetachedFromBranch: (stepId) => {
                        console.log(`[ScenarioMap] 🔓 STEP DETACHED FROM BRANCH | ID: ${stepId}`);
                        const stepNode = rf.getNodes().find((n) => n.id === stepId);
                        if (stepNode) {
                            const x = stepNode.position.x;
                            const y = stepNode.position.y;
                            operations.detachStepFromBranch(stepNode, x, y);
                        }
                    },
                    onConnectionRemoved: (sourceId, targetId, edgeId) => {
                        console.log(
                            `[ScenarioMap] 🗑️ CONNECTION REMOVED | Edge: ${edgeId} | Source: ${sourceId} | Target: ${targetId}`
                        );
                    },
                    onBranchResized: (branchId, width, height) => {
                        console.log(`[ScenarioMap] 📐 BRANCH RESIZED | ID: ${branchId}`, { width, height });
                        const branchNode = rf.getNodes().find((n) => n.id === branchId);
                        if (branchNode) {
                            operations.resizeNode(branchNode, width, height);
                        }
                    },
                },
            }),
        [rf, setNodes, setEdges, operations]
    );

    useEffect(() => {
        const branchNodes = nodes.filter((n) => n.type === FlowType.BranchNode);

        for (const branch of branchNodes) {
            if (resizeObserversRef.current.has(branch.id)) continue;

            const nodeElement = document.querySelector(
                `[data-id="${branch.id}"]`
            ) as HTMLElement | null;

            if (nodeElement == null) continue;

            const observer = new ResizeObserver((entries) => {

                if (isAnyBranchResizing()) {
                    return;
                }

                for (const entry of entries) {
                    const newWidth = Math.round(entry.contentRect.width);
                    const newHeight = Math.round(entry.contentRect.height);

                    const prev = branchSizesRef.current.get(branch.id);

                    if (
                        prev != null &&
                        (prev.width !== newWidth || prev.height !== newHeight)
                    ) {
                        if (isDraggingRef.current) {
                            pendingBranchResizeRef.current.set(branch.id, {
                                from: prev,
                                to: { width: newWidth, height: newHeight },
                            });
                        } else {
                            console.log(
                                `[ScenarioMap] 📐 BRANCH AUTO-EXPANDED | ID: ${branch.id}`,
                                {
                                    from: prev,
                                    to: { width: newWidth, height: newHeight },
                                    delta: {
                                        width: newWidth - prev.width,
                                        height: newHeight - prev.height,
                                    },
                                }
                            );

                            const branchNode = nodesRef.current.find(n => n.id === branch.id);
                            if (branchNode) {
                                operations.autoExpandBranch(branchNode, newWidth, newHeight);
                            }
                        }

                        setNodes((nds) =>
                            nds.map((n) =>
                                n.id === branch.id
                                    ? {
                                        ...n,
                                        style: {
                                            ...(n.style ?? {}),
                                            width: newWidth,
                                            height: newHeight,
                                        },
                                    }
                                    : n
                            )
                        );
                    }

                    branchSizesRef.current.set(branch.id, {
                        width: newWidth,
                        height: newHeight,
                    });
                }
            });

            observer.observe(nodeElement);
            resizeObserversRef.current.set(branch.id, observer);
        }

        const branchIds = new Set(branchNodes.map((n) => n.id));
        for (const [id, observer] of resizeObserversRef.current.entries()) {
            if (!branchIds.has(id)) {
                observer.disconnect();
                resizeObserversRef.current.delete(id);
                branchSizesRef.current.delete(id);
            }
        }

        return () => {
            for (const observer of resizeObserversRef.current.values()) {
                observer.disconnect();
            }
            resizeObserversRef.current.clear();
        };
    }, [nodes, setNodes]);

    // ScenarioMap.tsx - ФРАГМЕНТ: Оптимизированный smart sync
// 🚀 ОПТИМИЗАЦИЯ: Shallow equal вместо JSON.stringify

// ============================================================================
// HELPER: Shallow comparison для DTO
// ============================================================================

    /**
     * Быстрое сравнение объектов на первом уровне
     * ~10x быстрее чем JSON.stringify
     */
    function shallowEqualDto(obj1: any, obj2: any): boolean {
        // Fast path: одинаковая ссылка
        if (obj1 === obj2) return true;

        // Null/undefined checks
        if (obj1 == null || obj2 == null) return false;
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        // Разное количество ключей
        if (keys1.length !== keys2.length) return false;

        // Сравниваем значения
        for (const key of keys1) {
            // Игнорируем массивы отношений (они редко меняются и дорогие для сравнения)
            if (key === 'childRelations' || key === 'stepBranchRelations') {
                // Для массивов сравниваем только длину
                if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
                    if (obj1[key].length !== obj2[key].length) return false;
                    continue;
                }
            }

            // Для остальных полей — strict equality
            if (obj1[key] !== obj2[key]) return false;
        }

        return true;
    }

// ============================================================================
// ОПТИМИЗИРОВАННЫЙ useEffect синхронизации
// ============================================================================

    useEffect(() => {
        if (activeId == null || scenarioData == null) {
            setNodes([]);
            setEdges([]);
            dragStateRef.current.clear();
            resizeStateRef.current.clear();
            branchSizesRef.current.clear();
            for (const observer of resizeObserversRef.current.values()) {
                observer.disconnect();
            }
            resizeObserversRef.current.clear();
            return;
        }

        // 🔥 КРИТИЧНО: Пропускаем синхронизацию если обновление из ReactFlow
        if (updateSourceTracker.hasActiveReactFlowUpdates()) {
            console.log('[ScenarioMap] ⏭️ Skipping sync: update from ReactFlow');
            return;
        }

        try {
            const minimalState: RootState = {
                scenario: {
                    scenarios: { [activeId]: scenarioData.scenario },
                    branches: scenarioData.branches,
                    steps: scenarioData.steps,
                    relations: scenarioData.relations,
                },
            } as RootState;

            const flow = mapScenarioToFlow(minimalState, activeId);

            // 🔥 Умное обновление: обновляем только изменённые ноды
            if (nodesRef.current.length > 0) {
                const newNodesMap = new Map(flow.nodes.map(n => [n.id, n]));
                const currentNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));

                setNodes((prevNodes) => {
                    const updated = prevNodes
                        .map(currentNode => {
                            const newNode = newNodesMap.get(currentNode.id);

                            if (!newNode) {
                                // Нода удалена из Redux
                                return null;
                            }

                            // 🔥 Пропускаем ноды которые обновляются из ReactFlow
                            if (updateSourceTracker.isReactFlowUpdate(currentNode.id)) {
                                console.log(`[ScenarioMap] ⏭️ Skipping node ${currentNode.id}: ReactFlow update`);
                                return currentNode;
                            }

                            // 🚀 ОПТИМИЗАЦИЯ: Shallow equal вместо JSON.stringify
                            const needsUpdate =
                                currentNode.position.x !== newNode.position.x ||
                                currentNode.position.y !== newNode.position.y ||
                                currentNode.style?.width !== newNode.style?.width ||
                                currentNode.style?.height !== newNode.style?.height ||
                                !shallowEqualDto(currentNode.data.object, newNode.data.object);

                            if (!needsUpdate) {
                                return currentNode;
                            }

                            console.log(`[ScenarioMap] 🔄 Updating node ${currentNode.id} from external source`);

                            // Обновляем ноду
                            return {
                                ...currentNode,
                                position: newNode.position,
                                style: newNode.style,
                                data: {
                                    ...currentNode.data,
                                    object: newNode.data.object,
                                    x: newNode.data.x,
                                    y: newNode.data.y,
                                },
                            };
                        })
                        .filter((n): n is FlowNode => n !== null);

                    // Добавляем новые ноды
                    const newNodes = flow.nodes.filter(n => !currentNodesMap.has(n.id));

                    if (newNodes.length > 0) {
                        console.log(`[ScenarioMap] ➕ Adding ${newNodes.length} new nodes`);
                        return [...updated, ...newNodes];
                    }

                    return updated;
                });

                console.log('[ScenarioMap] ✅ Smart sync: updated only changed nodes');
            } else {
                // Первая загрузка
                setNodes(flow.nodes as FlowNode[]);
                console.log('[ScenarioMap] ✅ Initial load: set all nodes');
            }

            setEdges(flow.edges as FlowEdge[]);

            // Обновляем размеры веток
            const branches = flow.nodes.filter((n) => n.type === FlowType.BranchNode);
            for (const branch of branches) {
                const width = branch.style?.width;
                const height = branch.style?.height;
                if (typeof width === 'number' && typeof height === 'number') {
                    branchSizesRef.current.set(branch.id, {
                        width: Math.round(width),
                        height: Math.round(height),
                    });
                }
            }
        } catch (error) {
            console.error('[ScenarioMap] ❌ Error mapping scenario:', error);
        }
    }, [scenarioData, activeId]);

    const edgesRef = useEdgesRef(edges);
    const isValidConnection = useIsValidConnection(
        getNodeType,
        () => edgesRef.current,
        createIsValidConnection,
        ALLOW_MAP,
        TARGET_ALLOW_MAP
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) {
                console.warn('[ScenarioMap] Invalid connection: missing source or target');
                onConnectEnd();
                return;
            }

            console.log('[ScenarioMap] 🔗 Creating connection:', connection);

            const relationDto = operations.createRelation(
                connection.source as Guid,
                connection.target as Guid
            );

            if (!relationDto) {
                console.error('[ScenarioMap] Failed to create relation');
                onConnectEnd();
                return;
            }

            setEdges((eds) =>
                addEdge({ ...connection, id: relationDto.id, type: 'step' }, eds)
            );

            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === connection.source && n.data.object) {
                        const dto = n.data.object as any;
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                object: {
                                    ...dto,
                                    childRelations: [...(dto.childRelations ?? []), relationDto],
                                },
                            },
                        };
                    }
                    if (n.id === connection.target && n.data.object) {
                        const dto = n.data.object as any;
                        return {
                            ...n,
                            data: {
                                ...n.data,
                                object: {
                                    ...dto,
                                    parentRelations: [...(dto.parentRelations ?? []), relationDto],
                                },
                            },
                        };
                    }
                    return n;
                })
            );

            console.log('[ScenarioMap] ✅ Connection created successfully');
            onConnectEnd();
        },
        [operations, onConnectEnd, setEdges, setNodes]
    );


    // ScenarioMap.tsx - ФРАГМЕНТ: Агрессивная оптимизация onNodesChangeHandler
// 🚀 МАКСИМАЛЬНАЯ ПРОИЗВОДИТЕЛЬНОСТЬ: Полностью игнорируем updates дочерних нод во время drag

    // Ref для отслеживания активных parent drag операций
    const draggingParentIdsRef = useRef<Set<string>>(new Set());

    const onNodesChangeHandler: OnNodesChange<FlowNode> = useCallback((changes) => {
        // 🔥 Шаг 1: Обнаруживаем какие parent ноды в drag
        for (const change of changes) {
            if (change.type === 'position' && 'dragging' in change) {
                const node = nodesRef.current.find((n) => n.id === change.id);

                if (change.dragging === true) {
                    // Нода начала drag — добавляем в Set если это parent
                    if (node && (node.type === FlowType.BranchNode || hasChildren(node.id, nodesRef.current))) {
                        draggingParentIdsRef.current.add(change.id);
                    }
                } else if (change.dragging === false) {
                    // Нода закончила drag — убираем из Set
                    draggingParentIdsRef.current.delete(change.id);
                }
            }
        }

        // 🔥 Шаг 2: Фильтруем changes — ПОЛНОСТЬЮ убираем updates детей во время drag parent
        const filteredChanges = changes.filter((change) => {
            // Пропускаем все не-position changes без фильтрации
            if (change.type !== 'position') return true;

            const node = nodesRef.current.find((n) => n.id === change.id);
            if (!node) return true;

            // Если нода является child И её parent в drag → ПРОПУСКАЕМ
            if (node.parentId && draggingParentIdsRef.current.has(node.parentId)) {
                // 🚀 КРИТИЧНО: Полностью игнорируем position updates детей
                // ReactFlow будет обновлять их визуально, но мы не будем тратить CPU на обработку
                return false;
            }

            return true;
        });

        // Статистика оптимизации
        const filtered = changes.length - filteredChanges.length;
        if (filtered > 0) {
            console.log(`[ScenarioMap] 🚀 Performance boost: filtered ${filtered}/${changes.length} updates`);
        }

        // Применяем только нужные changes
        setNodes((nds) => applyNodeChanges(filteredChanges, nds) as FlowNode[]);

        // Обрабатываем только отфильтрованные changes
        for (const change of filteredChanges) {
            if (change.type === 'position' && 'position' in change && change.position != null) {
                const { id, position, dragging } = change;

                if (dragging === true) {
                    skipSyncRef.current = true;
                    isDraggingRef.current = true;

                    const node = nodesRef.current.find((n) => n.id === id);

                    if (node?.type === FlowType.BranchNode) {
                        isDraggingBranchRef.current = true;
                    }

                    if (!dragStateRef.current.has(id)) {
                        if (node != null) {
                            dragStateRef.current.set(id, {
                                x: Math.round(node.position.x),
                                y: Math.round(node.position.y),
                            });
                        }
                    }
                }
                else if (dragging === false) {
                    isDraggingRef.current = false;
                    isDraggingBranchRef.current = false;

                    const startState = dragStateRef.current.get(id);
                    const newX = Math.round(position.x);
                    const newY = Math.round(position.y);

                    if (startState != null && (startState.x !== newX || startState.y !== newY)) {
                        const node = nodesRef.current.find((n) => n.id === id);
                        if (node) {
                            operations.moveNode(node, newX, newY);
                        }
                    }

                    dragStateRef.current.delete(id);

                    for (const [branchId, resize] of pendingBranchResizeRef.current.entries()) {
                        const branchNode = nodesRef.current.find((n) => n.id === branchId);
                        if (branchNode) {
                            operations.autoExpandBranch(branchNode, resize.to.width, resize.to.height);
                        }
                    }
                    pendingBranchResizeRef.current.clear();

                    setTimeout(() => {
                        skipSyncRef.current = false;
                        console.log('[ScenarioMap] ✅ Drag completed, sync re-enabled');
                    }, 100);
                }
            }

            if (change.type === 'dimensions' && 'dimensions' in change && change.dimensions != null) {
                const { id, dimensions, resizing } = change;

                if (resizing === true) {
                    if (!resizeStateRef.current.has(id)) {
                        const node = nodesRef.current.find((n) => n.id === id);
                        if (node) {
                            const currentWidth = typeof node.style?.width === 'number'
                                ? node.style.width
                                : node.measured?.width ?? 0;

                            const currentHeight = typeof node.style?.height === 'number'
                                ? node.style.height
                                : node.measured?.height ?? 0;

                            if (currentWidth > 0 && currentHeight > 0) {
                                resizeStateRef.current.set(id, {
                                    width: Math.round(currentWidth),
                                    height: Math.round(currentHeight),
                                });
                                console.log(`[ScenarioMap] 🔄 RESIZE START | ID: ${id}`, {
                                    width: currentWidth,
                                    height: currentHeight
                                });
                            }
                        }
                    }
                }
                else if (resizing === false) {
                    const startState = resizeStateRef.current.get(id);
                    const newWidth = Math.round(dimensions.width);
                    const newHeight = Math.round(dimensions.height);

                    if (startState != null && (startState.width !== newWidth || startState.height !== newHeight)) {
                        const node = nodesRef.current.find((n) => n.id === id);
                        if (node) {
                            console.log(`[ScenarioMap] ✅ RESIZE END | ID: ${id}`, {
                                from: startState,
                                to: { width: newWidth, height: newHeight },
                            });
                            operations.resizeNode(node, newWidth, newHeight);
                        }
                    }
                    resizeStateRef.current.delete(id);
                }
            }

            if (change.type === 'select') {
                const node = nodesRef.current.find((n) => n.id === change.id);
                console.log(`[ScenarioMap] 🎯 NODE ${change.selected ? 'SELECTED' : 'DESELECTED'} | Type: ${node?.type ?? 'unknown'} | ID: ${change.id}`);
            }
        }
    }, [setNodes, operations]);

// 🔥 Helper function: проверить есть ли у ноды дети
    function hasChildren(nodeId: string, allNodes: FlowNode[]): boolean {
        return allNodes.some((n) => n.parentId === nodeId);
    }

    const onEdgesChangeHandler: OnEdgesChange<FlowEdge> = useCallback((changes) => {
        setEdges((eds) => applyEdgeChanges(changes, eds) as FlowEdge[]);

        for (const change of changes) {
            if (change.type === 'select') {
                console.log(
                    `[ScenarioMap] 🎯 EDGE ${change.selected ? 'SELECTED' : 'DESELECTED'} | ID: ${change.id}`
                );
            }

            if (change.type === 'remove') {
                console.log(`[ScenarioMap] 🗑️ EDGE REMOVED | ID: ${change.id}`);
            }
        }
    }, []);

    const handleSelectionChange = useCallback(
        (params: OnSelectionChangeParams): void => {
            onSelectionChange({
                nodes: params.nodes as FlowNode[],
                edges: params.edges as FlowEdge[],
            });
        },
        [onSelectionChange]
    );


    return (
        <div data-theme={theme} className={styles.containerScenarioMap} style={{ height: '70vh' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onEdgeMouseEnter={(_, edge): void =>
                    setEdges((es) =>
                        es.map((e): FlowEdge =>
                            e.id === edge.id ? { ...e, data: { ...e.data, __hovered: true } } : e
                        )
                    )
                }
                onEdgeMouseLeave={(_, edge): void =>
                    setEdges((es) =>
                        es.map((e): FlowEdge =>
                            e.id === edge.id ? { ...e, data: { ...e.data, __hovered: false } } : e
                        )
                    )
                }
                onNodesChange={onNodesChangeHandler}
                onEdgesChange={onEdgesChangeHandler}
                onSelectionChange={handleSelectionChange}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                isValidConnection={isValidConnection}
                onNodeDragStart={dragStartHandler.onNodeDragStart}
                onNodeDragStop={dragStopHandler.onNodeDragStop}
                minZoom={0.01}
                maxZoom={10}
                defaultEdgeOptions={{
                    animated: true,
                    type: 'step',
                    markerEnd: { type: MarkerType.ArrowClosed },
                    style: {
                        stroke: 'var(--edge-default-color, #ffffff)',
                        strokeWidth: 'var(--edge-width, 1.5)',
                        opacity: 1,
                    },
                }}
                connectionLineType={ConnectionLineType.Step}
                selectionOnDrag
                selectionMode={SelectionMode.Partial}
                panOnDrag={[1, 2]}
                panOnScroll={false}
                zoomOnScroll
                zoomActivationKeyCode={['Control', 'Meta']}
                autoPanSpeed={3}
                fitView
                className={styles.customFlow}
            >
                <Panel position="top-left">
                    <LeftPanel />
                </Panel>

                <Panel position="top-right">
                    <RightPanel />
                </Panel>

                <Panel position="bottom-left">
                    <button
                        className={styles.deleteBtn}
                        onClick={deleteSelected}
                        title="Удалить выбранное (Del/Backspace)"
                    >
                        Удалить
                    </button>
                </Panel>

                <Controls className={`${styles.flowControls}`} position="top-left" />
                <Background
                    id="1"
                    gap={7}
                    lineWidth={0.1}
                    color="var(--grid-color-primary, #464646)"
                    variant={BackgroundVariant.Lines}
                />
                <Background
                    id="2"
                    gap={28}
                    lineWidth={0.1}
                    color="var(--grid-color-secondary, #767676)"
                    variant={BackgroundVariant.Lines}
                />
            </ReactFlow>
        </div>
    );
};