// src/features/scenarioEditor/core/ui/map/ScenarioMap/ScenarioMap.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Background,
    BackgroundVariant,
    type Connection,
    ConnectionLineType,
    Controls,
    type EdgeChange,
    type IsValidConnection,
    MarkerType,
    type OnNodesChange,
    type NodeChange,
    Panel,
    ReactFlow,
    SelectionMode,
    useReactFlow,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDispatch, useSelector } from 'react-redux';

import styles from './ScenarioMap.module.css';

// Типы
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { nodeTypes as nodeTypesRegistry } from '@/features/scenarioEditor/shared/contracts/types/nodeTypes';
import { edgeTypes } from '@/features/scenarioEditor/shared/contracts/types/edgeTypes';
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';

// Панели
import { RightPanel } from '@scenario/core/ui/map/RightPanel/RightPanel';
import LeftPanel from '@scenario/core/ui/map/LeftPanel/LeftPanel';

// State & Selectors
import type { AppDispatch, RootState } from '@/baseStore/store';
import { store } from '@/baseStore/store';

// Утилиты
import { isAnyBranchResizing } from '@scenario/core/branchResize/branchResizeGuard';
import { createIsValidConnection } from '@scenario/core/edgeMove/isValidConnection';
import { ALLOW_MAP, TARGET_ALLOW_MAP } from '@scenario/core/edgeMove/connectionRules';

// Сервисы и хуки
import { HoverBranchService } from '@scenario/core/handlers/HoverBranchService';
import { NodeDragStopHandler } from '@scenario/core/handlers/NodeDragStopHandler';
import { ConnectionHandler } from '@scenario/core/handlers/ConnectionHandler';
import { useEdgesRef, useIsValidConnection } from '@scenario/core/hooks/useConnectionValidation';
import { useFitViewOnVersion } from '@scenario/core/hooks/useFitViewOnVersion';
import { useBranchSizeValidation } from '@scenario/core/hooks/useBranchSizeValidation';
import { useSelection } from '@scenario/core/hooks/useSelection';
import { useConnectContext } from '@scenario/core/hooks/useConnectContext';
import { useRightMousePan } from '@scenario/core/hooks/useRightMousePan';
import { omitNodeProps } from '@scenario/core/utils/omitNodeProps';
import {
    absOf,
    ensureParentBeforeChild,
    pickDeepestBranchByTopLeft,
    rectOf,
} from '@scenario/core/utils/dropUtils';

// Тема
import { useTheme } from '@app/providers/theme/useTheme';

// Маппинг
import { mapScenarioToFlow } from '@scenario/core/mapScenarioToFlow';

import type { Guid } from '@app/lib/types/Guid';
import { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto';
import {
    selectActiveScenarioId,
    selectDenormalizedScenario,
    selectScenarioById
} from '@scenario/store/scenarioSelectors.ts';
import {
    refreshScenarioById,
    ScenarioLoadState,
    updateStep,
    updateBranch,
    deleteStep,
    deleteBranch,
    deleteRelation,
    addRelation,
    addStep,
} from '@scenario/store/scenarioSlice.ts';

export interface ScenarioEditorProps {}

export const ScenarioMap: React.FC<ScenarioEditorProps> = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { theme } = useTheme();

    // --- Состояние графа ---
    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [edges, setEdges] = useState<FlowEdge[]>([]);

    const edgesRef = useEdgesRef(edges);
    const nodesRef = useRef<FlowNode[]>([]);

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    // --- Активный сценарий ---
    const activeId = useSelector(selectActiveScenarioId);

    // Получаем мета-информацию
    const scenarioMeta = useSelector((state: RootState) =>
        activeId ? selectScenarioById(state, activeId) : null
    );

    // Получаем полную денормализованную структуру для рендера
    const activeScenario = useSelector((state: RootState) =>
        activeId ? selectDenormalizedScenario(state, activeId) : null
    );

    // --- Отслеживание позиций для фиксации изменений ---
    const dragStartPositionsRef = useRef<Map<string, { x: number; y: number; branchId: Guid }>>(new Map());

    // ⚡ СИНХРОНИЗАЦИЯ: Redux → ReactFlow
    useEffect(() => {
        if (!activeScenario) {
            setNodes([]);
            setEdges([]);
            dragStartPositionsRef.current.clear();
            return;
        }

        console.log('[ScenarioMap] 🔄 Syncing Redux → ReactFlow');

        const { nodes: newNodes, edges: newEdges } = mapScenarioToFlow(activeScenario);
        setNodes(newNodes);
        setEdges(newEdges);
    }, [activeScenario]);

    // Обработка изменений edges
    const onEdgesChangeHandler = useCallback(
        (changes: EdgeChange[]) => {
            // 1. Применяем изменения к UI
            setEdges((eds) => applyEdgeChanges(changes, eds));

            // 2. Фиксируем удаление в Redux
            if (!activeId) return;

            for (const ch of changes) {
                if (ch.type === 'remove' && ch.id) {
                    const edge = edgesRef.current.find((e) => e.id === ch.id);
                    if (!edge) continue;

                    const state = store.getState();
                    const relation = state.scenario.relations.entities[edge.id];

                    if (relation) {
                        console.log('[ScenarioMap] Deleting relation:', edge.id);
                        dispatch(deleteRelation(edge.id as Guid));
                    }
                }
            }
        },
        [dispatch, activeId, edgesRef]
    );

    // Обработка изменений nodes
    const onNodesChangeHandler: OnNodesChange<FlowNode> = useCallback(
        (changes: NodeChange<FlowNode>[]) => {
            // 1. Применяем изменения к UI
            setNodes((nds) => applyNodeChanges(changes, nds));

            // 2. Обрабатываем специфичную логику
            for (const change of changes) {
                // Начало перетаскивания - запоминаем начальную позицию
                if (change.type === 'position' && change.dragging === true) {
                    const node = nodesRef.current.find((n) => n.id === change.id);
                    if (!node) continue;

                    const isBranch = node.type === 'branchNode' || node.type === FlowType.branchNode;
                    if (isBranch) continue;

                    const state = store.getState();
                    const step = state.scenario.steps.entities[change.id];

                    if (step && (step as any).__persisted) {
                        if (!dragStartPositionsRef.current.has(change.id)) {
                            dragStartPositionsRef.current.set(change.id, {
                                x: step.x ?? node.position.x,
                                y: step.y ?? node.position.y,
                                branchId: step.branchId,
                            });
                            console.log('[ScenarioMap] Drag start:', change.id);
                        }
                    }
                }

                // Конец перетаскивания - обновляем Redux
                if (change.type === 'position' && change.dragging === false && change.position) {
                    const startPos = dragStartPositionsRef.current.get(change.id);
                    if (!startPos) continue;

                    const newX = Math.round(change.position.x);
                    const newY = Math.round(change.position.y);

                    if (startPos.x !== newX || startPos.y !== newY) {
                        if (activeId) {
                            const state = store.getState();
                            const step = state.scenario.steps.entities[change.id];

                            if (step && (step as any).__persisted) {
                                console.log('[ScenarioMap] 🎯 Updating step position in Redux:', {
                                    stepId: change.id,
                                    oldX: step.x,
                                    oldY: step.y,
                                    newX,
                                    newY,
                                });

                                dispatch(
                                    updateStep({
                                        stepId: change.id as Guid,
                                        changes: { x: newX, y: newY },
                                    })
                                );
                            }
                        }
                    }

                    dragStartPositionsRef.current.delete(change.id);
                }

                // Удаление node
                if (change.type === 'remove') {
                    dragStartPositionsRef.current.delete(change.id);
                }

                // Изменение размеров веток
                if (change.type === 'dimensions' && change.dimensions && change.resizing === false) {
                    const node = nodesRef.current.find((n) => n.id === change.id);
                    if (!node) continue;

                    const isBranch = node.type === 'branchNode' || node.type === FlowType.branchNode;

                    if (isBranch && activeId) {
                        const state = store.getState();
                        const branch = state.scenario.branches.entities[change.id];

                        if (branch && change.dimensions.width && change.dimensions.height) {
                            const newWidth = Math.round(change.dimensions.width);
                            const newHeight = Math.round(change.dimensions.height);

                            if (branch.width !== newWidth || branch.height !== newHeight) {
                                console.log('[ScenarioMap] Resizing branch:', change.id);
                                dispatch(
                                    updateBranch({
                                        branchId: change.id as Guid,
                                        changes: {
                                            width: newWidth,
                                            height: newHeight,
                                        },
                                    })
                                );
                            }
                        }
                    }
                }
            }
        },
        [dispatch, activeId]
    );

    // Версия для пересборки
    const scenarioVersion = scenarioMeta
        ? `${scenarioMeta.id}:${scenarioMeta.lastFetchedAt ?? 0}:${scenarioMeta.loadState}`
        : 'none';

    // Догрузка деталей при необходимости
    useEffect(() => {
        if (!activeId) return;
        if (scenarioMeta?.loadState !== ScenarioLoadState.Full) {
            dispatch(refreshScenarioById(activeId, false)).catch(() => {});
        }
    }, [dispatch, activeId, scenarioMeta?.loadState]);

    // Доступ к RF
    const rf = useReactFlow<FlowNode, FlowEdge>();

    // Подгон вида и валидация размеров веток
    useFitViewOnVersion(rf as any, scenarioVersion);
    useBranchSizeValidation(rf as any);

    // Helpers
    const getAll = useCallback(() => rf.getNodes() as FlowNode[], [rf]);

    // Выбор/удаление
    const { selectedNodeIds, selectedEdgeIds, onSelectionChange, deleteSelected } = useSelection({
        setNodes,
        setEdges,
        getNodes: () => nodesRef.current,
        getEdges: () => edgesRef.current,
        onDeleted: ({ nodes, edges }) => {
            if (!activeId) return;

            for (const n of nodes) {
                const isBranch = n.type === 'branchNode' || n.type === FlowType.branchNode;
                const state = store.getState();

                if (isBranch) {
                    const branch = state.scenario.branches.entities[n.id];
                    if (branch) {
                        dispatch(deleteBranch({ branchId: n.id as Guid }));
                    }
                } else {
                    const step = state.scenario.steps.entities[n.id];
                    if (step) {
                        dispatch(deleteStep({ branchId: step.branchId, stepId: n.id as Guid }));
                    }
                }

                dragStartPositionsRef.current.delete(n.id);
            }

            for (const e of edges) {
                const state = store.getState();
                const relation = state.scenario.relations.entities[e.id];
                if (relation) {
                    dispatch(deleteRelation(e.id as Guid));
                }
            }
        },
    });

    // Drag-соединение
    const { onConnectStart, onConnectEnd, getNodeType } = useConnectContext({ rf, setNodes });

    // Hover ветки-цели
    const hover = useMemo(
        () =>
            new HoverBranchService(getAll, setNodes, {
                absOf,
                pickDeepestBranchByTopLeft,
                isAnyBranchResizing,
            }),
        [getAll, setNodes]
    );
    const setHoverBranch = useCallback(hover.setHoverBranch, [hover]);
    const onNodeDrag = useCallback(hover.onNodeDrag, [hover]);

    // Ctrl-drag ids
    const ctrlDragIdsRef = useRef<Set<string>>(new Set());

    // Старт перетаскивания
    const onNodeDragStart = useCallback(
        (e: React.MouseEvent | React.TouchEvent, node: FlowNode) => {
            const ctrl = (e as any).ctrlKey === true;
            if (ctrl && node.parentId) {
                ctrlDragIdsRef.current.add(node.id);
                setNodes((nds) =>
                    nds.map((n): FlowNode => {
                        if (n.id !== node.id) return n;
                        const base = omitNodeProps(n, ['extent']);
                        return { ...base, expandParent: false } as FlowNode;
                    })
                );
            }
        },
        [setNodes]
    );

    // Финализация перетаскивания
    const dropHandler = useMemo(
        () =>
            new NodeDragStopHandler({
                getAll,
                setNodes,
                setHoverBranch,
                ctrlDragIdsRef,
                utils: {
                    absOf,
                    rectOf,
                    ensureParentBeforeChild,
                    pickDeepestBranchByTopLeft,
                    isAnyBranchResizing,
                },
                callbacks: {
                    onStepAttachedToBranch: (stepId, branchId, x, y) => {
                        if (!activeId) return;

                        const state = store.getState();
                        const step = state.scenario.steps.entities[stepId];
                        const isPersisted = !!(step && (step as any).__persisted);

                        if (isPersisted && step) {
                            dispatch(
                                updateStep({
                                    stepId: stepId as Guid,
                                    changes: { branchId, x, y },
                                })
                            );
                        } else if (step) {
                            dispatch(
                                addStep({
                                    branchId: branchId as Guid,
                                    step: { ...step, branchId, x, y } as any,
                                })
                            );

                            rf.setNodes((nds) =>
                                nds.map((nn) =>
                                    nn.id === stepId ? { ...nn, data: { ...nn.data, __persisted: true } } : nn
                                )
                            );
                        }
                    },

                    onStepMoved: (stepId, x, y) => {
                        // Обработка в onNodesChangeHandler
                    },

                    onStepDetachedFromBranch: (stepId) => {
                        if (!activeId) return;

                        const state = store.getState();
                        const step = state.scenario.steps.entities[stepId];
                        const isPersisted = !!(step && (step as any).__persisted);
                        if (!isPersisted || !step) return;

                        dispatch(deleteStep({ branchId: step.branchId, stepId: stepId as Guid }));

                        rf.setNodes((nds) =>
                            nds.map((nn) =>
                                nn.id === stepId ? { ...nn, data: { ...nn.data, __persisted: false } } : nn
                            )
                        );

                        dragStartPositionsRef.current.delete(stepId);
                    },

                    onBranchResized: (branchId, width, height) => {
                        // Обработка в onNodesChangeHandler
                    },
                },
            }),
        [getAll, setNodes, setHoverBranch, dispatch, activeId, rf]
    );

    const onNodeDragStop = useCallback(dropHandler.onNodeDragStop, [dropHandler]);

    // Соединения
    const connectionHandler = useMemo(
        () => new ConnectionHandler(setEdges, onConnectEnd),
        [setEdges, onConnectEnd]
    );

    const onConnect = useCallback(
        (conn: Connection) => {
            connectionHandler.onConnect(conn);

            if (!activeId || !conn.source || !conn.target) return;

            const newRelation: StepRelationDto = {
                id: crypto.randomUUID() as Guid,
                parentStepId: conn.source as Guid,
                childStepId: conn.target as Guid,
                conditionExpression: null,
                conditionOrder: 0,
            };

            dispatch(addRelation(newRelation));
        },
        [connectionHandler, dispatch, activeId]
    );

    // Валидатор соединений
    const isValidConnection: IsValidConnection<FlowEdge> = useIsValidConnection(
        getNodeType,
        () => edgesRef.current,
        createIsValidConnection,
        ALLOW_MAP,
        TARGET_ALLOW_MAP
    );

    // Реестр типов
    const nodeTypes = useMemo(() => nodeTypesRegistry, []);

    const { containerRef, onMouseDown: onRmbDown } = useRightMousePan(rf as any);

    return (
        <div
            ref={containerRef}
            onMouseDown={onRmbDown}
            data-theme={theme}
            className={styles.containerScenarioMap}
            style={{ height: '70vh' }}
        >
            <ReactFlow<FlowNode, FlowEdge>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onEdgeMouseEnter={(_, edge) =>
                    setEdges((es) =>
                        es.map((e) => (e.id === edge.id ? { ...e, data: { ...e.data, __hovered: true } } : e))
                    )
                }
                onEdgeMouseLeave={(_, edge) =>
                    setEdges((es) =>
                        es.map((e) => (e.id === edge.id ? { ...e, data: { ...e.data, __hovered: false } } : e))
                    )
                }
                onSelectionChange={onSelectionChange}
                onNodesChange={onNodesChangeHandler}
                onEdgesChange={onEdgesChangeHandler}
                onNodeDrag={onNodeDrag}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                onConnectStart={onConnectStart}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                isValidConnection={isValidConnection}
                minZoom={0.01}
                maxZoom={10}
                defaultEdgeOptions={{
                    animated: true,
                    type: 'step' as const,
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
                panOnScroll
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
                        disabled={selectedNodeIds.size === 0 && selectedEdgeIds.size === 0}
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