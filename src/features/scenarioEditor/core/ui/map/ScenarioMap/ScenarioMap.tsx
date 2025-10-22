// src/features/scenarioEditor/core/ui/map/ScenarioMap/ScenarioMap.tsx

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
import { useSelector } from 'react-redux';
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
import { isAnyBranchResizing } from '@scenario/core/branchResize/branchResizeGuard';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import {useScenarioOperations} from "@scenario/core/hooks/useScenarioOperations.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import {useConnectContext} from "@scenario/core/hooks/useConnectContext.ts";
import {useEdgesRef, useIsValidConnection} from "@scenario/core/hooks/useConnectionValidation.ts";
import {createIsValidConnection} from "@scenario/core/edgeMove/isValidConnection.ts";
import {ALLOW_MAP, TARGET_ALLOW_MAP} from "@scenario/core/edgeMove/connectionRules.ts";
import {NodeDragStartHandler} from "@scenario/core/handlers/NodeDragStartHandler.ts";
import {useShiftKey} from "@app/lib/hooks/useShiftKey.ts";
import type {BaseNodeDto} from "@scenario/shared/contracts/registry/NodeTypeContract.ts";


export interface ScenarioEditorProps {}

interface DragState {
    readonly x: number;
    readonly y: number;
}

interface ResizeState {
    readonly width: number;
    readonly height: number;
}

// Мемоизированный селектор для данных сценария
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
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);

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


    // ============================================================================
    // КОНТЕКСТ СОЕДИНЕНИЯ (для подсветки handles)
    // ============================================================================

    const { onConnectStart, onConnectEnd, getNodeType } = useConnectContext({
        rf,
        setNodes,
    });

    // 1. В секции REFS (после других useRef):
    const shiftDragIdsRef = useRef<Set<string>>(new Set());


    // Отслеживаем Shift
    const isShiftPressed = useShiftKey();

    // extent/expandParent у нод при нажатии Shift
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => {
                // Только для нод внутри веток (не сами ветки)
                if (node.parentId && node.type !== FlowType.BranchNode) {
                    if (isShiftPressed) {
                        // Shift нажат: убираем ограничения
                        return {
                            ...node,
                            extent: undefined,
                            expandParent: false,
                        };
                    } else {
                        // Shift отпущен: возвращаем ограничения
                        return {
                            ...node,
                            extent: 'parent' as const,
                            expandParent: true,
                        };
                    }
                }
                return node;
            }) as FlowNode<BaseNodeDto>[]
        );
    }, [isShiftPressed, setNodes]);

    const dragStartHandler = useMemo(
        () =>
            new NodeDragStartHandler({
                shiftDragIdsRef,
            }),
        []
    );




    // Хук выбора и удаления
    const { onSelectionChange, deleteSelected } = useSelection({
        setNodes,
        setEdges,
        getNodes: rf.getNodes,
        getEdges: rf.getEdges,
        onDeleted: (payload) => {
            console.log('[ScenarioMap] 🗑️ Deleted:', payload);

            // ✅ КРИТИЧНО: Вызываем operations.deleteNode для каждой удалённой ноды
            // deleteNode внутри проверит __persisted и вызовет dispatch только для персистентных
            for (const node of payload.nodes) {
                // Проверяем, что нода персистентная (уже в БД)
                if (node.data.__persisted === true) {
                    operations.deleteNode(node);
                }
            }

            // TODO: Если нужно удалять связи (edges), добавить operations.deleteRelation
            // for (const edge of payload.edges) {
            //     operations.deleteRelation(edge);
            // }
        },
    });

    // src/features/scenarioEditor/core/ui/map/ScenarioMap/ScenarioMap.tsx

// 5. Обновите dragStopHandler (замените существующий):
    const dragStopHandler = useMemo(
        () =>
            new NodeDragStopHandler({
                getAll: rf.getNodes,
                getAllEdges: rf.getEdges,
                setNodes,
                setEdges,
                setHoverBranch,
                shiftDragIdsRef, // ← КРИТИЧНО: должен быть передан
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
                        // TODO: Добавьте operations.deleteRelation когда будет готов
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

    // Отслеживание DOM-изменений размеров веток через ResizeObserver
    useEffect(() => {
        const branchNodes = nodes.filter((n) => n.type === FlowType.BranchNode);

        for (const branch of branchNodes) {
            if (resizeObserversRef.current.has(branch.id)) continue;

            const nodeElement = document.querySelector(
                `[data-id="${branch.id}"]`
            ) as HTMLElement | null;

            if (nodeElement == null) continue;

            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const newWidth = Math.round(entry.contentRect.width);
                    const newHeight = Math.round(entry.contentRect.height);

                    const prev = branchSizesRef.current.get(branch.id);

                    if (
                        prev != null &&
                        (prev.width !== newWidth || prev.height !== newHeight)
                    ) {
                        // Если сейчас идёт dragging - НЕ логируем, а сохраняем для отложенного лога
                        if (isDraggingRef.current) {
                            pendingBranchResizeRef.current.set(branch.id, {
                                from: prev,
                                to: { width: newWidth, height: newHeight },
                            });
                        } else {
                            // Нет активного dragging - логируем сразу
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

    // Синхронизация Redux → ReactFlow
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
            setNodes(flow.nodes as FlowNode[]);
            setEdges(flow.edges as FlowEdge[]);

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

    // Глобальное отслеживание Ctrl
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.key === 'Meta') {
                setIsCtrlPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.key === 'Meta') {
                setIsCtrlPressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Динамически обновляем selectable и draggable для веток при изменении Ctrl
    useEffect(() => {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.type === FlowType.BranchNode) {
                    if (isCtrlPressed) {
                        // Ctrl нажат — делаем ветки интерактивными
                        return {
                            ...n,
                            selectable: true,
                            draggable: true,
                        };
                    } else {
                        // Ctrl отпущен
                        // Если сейчас идёт драг ветки — НЕ трогаем её
                        if (isDraggingBranchRef.current && n.selected === true) {
                            return n;
                        }

                        // Иначе — блокируем и снимаем выделение
                        return {
                            ...n,
                            selectable: false,
                            draggable: false,
                            selected: false,
                        };
                    }
                }
                return n;
            })
        );
    }, [isCtrlPressed]);

    // ============================================================================
    // ВАЛИДАЦИЯ СОЕДИНЕНИЙ
    // ============================================================================

    const edgesRef = useEdgesRef(edges);
    const isValidConnection = useIsValidConnection(
        getNodeType,
        () => edgesRef.current,
        createIsValidConnection,
        ALLOW_MAP,
        TARGET_ALLOW_MAP
    );

    // ============================================================================
    // ОБРАБОТЧИК СОЗДАНИЯ СВЯЗИ
    // ============================================================================


    const onConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) {
                console.warn('[ScenarioMap] Invalid connection: missing source or target');
                onConnectEnd();
                return;
            }

            console.log('[ScenarioMap] 🔗 Creating connection:', connection);

            // Создаём связь через operations
            const relationDto = operations.createRelation(
                connection.source as Guid,
                connection.target as Guid
            );

            if (!relationDto) {
                console.error('[ScenarioMap] Failed to create relation');
                onConnectEnd();
                return;
            }

            // Добавляем ребро в ReactFlow (с id из relationDto)
            setEdges((eds) =>
                addEdge({ ...connection, id: relationDto.id, type: 'step' }, eds)
            );

            // Обновляем childRelations/parentRelations в нодах
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

    const onNodesChangeHandler: OnNodesChange<FlowNode> = useCallback((changes) => {
        setNodes((nds) => {
            let result = applyNodeChanges(changes, nds) as FlowNode[];

            for (const change of changes) {
                if (change.type === 'dimensions' && 'dimensions' in change && change.dimensions) {
                    result = result.map(n =>
                        n.id === change.id
                            ? {
                                ...n,
                                style: {
                                    ...n.style,
                                    width: change.dimensions?.width,
                                    height: change.dimensions?.height
                                }
                            }
                            : n
                    );
                }
            }

            return result;
        });

        for (const change of changes) {
            if (change.type === 'position' && 'position' in change && change.position != null) {
                const { id, position, dragging } = change;

                if (dragging === true) {
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
                } else if (dragging === false) {
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
                }
            }

            if (change.type === 'dimensions' && 'dimensions' in change && change.dimensions != null) {
                const { id, dimensions, resizing } = change;
                if (resizing === true) {
                    if (!resizeStateRef.current.has(id)) {
                        const node = nodesRef.current.find((n) => n.id === id);
                        if (node?.style?.width != null && node.style.height != null) {
                            resizeStateRef.current.set(id, {
                                width: Math.round(node.style.width as number),
                                height: Math.round(node.style.height as number),
                            });
                        }
                    }
                } else if (resizing === false) {
                    const startState = resizeStateRef.current.get(id);
                    const newWidth = Math.round(dimensions.width);
                    const newHeight = Math.round(dimensions.height);
                    if (startState != null && (startState.width !== newWidth || startState.height !== newHeight)) {
                        const node = nodesRef.current.find((n) => n.id === id);
                        if (node) {
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

            if (change.type === 'remove') {
                const node = nodesRef.current.find((n) => n.id === change.id);
                if (node) {
                    operations.deleteNode(node);
                }
            }
        }
    }, [operations]);

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

                //  ДОБАВЬ ЭТО (если нужно): Удаление связи между нодами
                // const edge = edgesRef.current.find((e) => e.id === change.id);
                // if (edge) {
                //     operations.deleteRelation(edge);
                // }
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
                onConnect={onConnect} // Connect
                onConnectStart={onConnectStart} // Connect
                onConnectEnd={onConnectEnd} // Connect
                isValidConnection={isValidConnection} // Connect
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
                panOnScroll={false} // ← Отключаем скролл для панорамирования
                zoomOnScroll // ← Включаем зум на скролл БЕЗ модификаторов
                zoomActivationKeyCode={['Control', 'Meta']} // ← Зум теперь ТОЛЬКО с Ctrl/Cmd
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