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
    applyNodeChanges, // ⚡ ВАЖНО: импортируем applyNodeChanges
    applyEdgeChanges, // ⚡ ВАЖНО: импортируем applyEdgeChanges
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
} from "@scenario/store/scenarioSelectors.ts";
import {useCommandDispatcher} from "@scenario/core/features/scenarioChangeCenter/useCommandDispatcher.ts";
import {
    BranchCommands,
    RelationCommands,
    StepCommands
} from "@scenario/core/features/scenarioChangeCenter/commandBuilders.ts";
import {refreshScenarioById, ScenarioLoadState} from "@scenario/store/scenarioSlice.ts";
import {HistoryControls} from "@scenario/core/features/historySystem/HistoryControls/HistoryControls.tsx";
import {PendingChangesViewer} from "@scenario/core/features/scenarioChangeCenter/PendingChangesViewer.tsx";

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

    // Command Dispatcher
    const commandDispatcher = useCommandDispatcher(activeId);

    // --- Отслеживание позиций для фиксации в истории ---
    const dragStartPositionsRef = useRef<Map<string, { x: number; y: number; branchId: Guid }>>(new Map());

    // ⚡ ИСПРАВЛЕНИЕ: Правильная обработка изменений edges
    const onEdgesChangeHandler = useCallback(
        (changes: EdgeChange[]) => {
            // 1. СНАЧАЛА применяем изменения к UI
            setEdges((eds) => applyEdgeChanges(changes, eds));

            // 2. ПОТОМ фиксируем удаление в истории
            if (!commandDispatcher || !activeId) return;

            for (const ch of changes) {
                if (ch.type === 'remove' && ch.id) {
                    const edge = edgesRef.current.find((e) => e.id === ch.id);
                    if (!edge) continue;

                    const state = store.getState();
                    const relation = state.scenario.relations.entities[edge.id];

                    if (relation) {
                        commandDispatcher.execute(
                            RelationCommands.delete(activeId, {
                                relationId: edge.id as Guid,
                                previousState: relation,
                            })
                        );
                    }
                }
            }
        },
        [commandDispatcher, activeId, edgesRef]
    );

    // ScenarioMap.tsx (ТОЛЬКО ИЗМЕНЕННАЯ ЧАСТЬ onNodesChangeHandler)

    // ScenarioMap.tsx (ТОЛЬКО ИЗМЕНЕННАЯ ЧАСТЬ onNodesChangeHandler)

    const onNodesChangeHandler: OnNodesChange<FlowNode> = useCallback(
        (changes: NodeChange<FlowNode>[]) => {
            // 1. СНАЧАЛА применяем ВСЕ стандартные изменения React Flow
            setNodes((nds) => applyNodeChanges(changes, nds));

            // 2. ПОТОМ обрабатываем специфичные для нашей логики вещи
            for (const change of changes) {
                // Начало перетаскивания - запоминаем начальную позицию
                if (change.type === 'position' && change.dragging === true) {
                    const node = nodesRef.current.find((n) => n.id === change.id);
                    if (!node) continue;

                    // ⚡ ИСПРАВЛЕНИЕ: Проверяем что это НЕ ветка
                    const isBranch = node.type === 'branchNode' || node.type === FlowType.branchNode;
                    if (isBranch) continue; // Ветки не записываем в dragStartPositions

                    const state = store.getState();
                    const step = state.scenario.steps.entities[change.id];

                    if (step && (step as any).__persisted) {
                        // ⚡ ИСПРАВЛЕНИЕ: Записываем только ОДИН раз при первом dragging: true
                        if (!dragStartPositionsRef.current.has(change.id)) {
                            dragStartPositionsRef.current.set(change.id, {
                                x: step.x ?? node.position.x,
                                y: step.y ?? node.position.y,
                                branchId: step.branchId,
                            });
                            console.log('[ScenarioMap] Saved start position for:', change.id, dragStartPositionsRef.current.get(change.id));
                        }
                    }
                }

                // Конец перетаскивания - фиксируем изменение в истории
                if (change.type === 'position' && change.dragging === false && change.position) {
                    const startPos = dragStartPositionsRef.current.get(change.id);

                    if (!startPos) {
                        // Это нормально для веток - они не должны записываться в историю через position change
                        continue;
                    }

                    const newX = Math.round(change.position.x);
                    const newY = Math.round(change.position.y);

                    // Проверяем, изменилась ли позиция
                    if (startPos.x !== newX || startPos.y !== newY) {
                        if (commandDispatcher && activeId) {
                            const state = store.getState();
                            const step = state.scenario.steps.entities[change.id];

                            if (step && (step as any).__persisted) {
                                console.log('[ScenarioMap] Recording position update in history');
                                commandDispatcher.execute(
                                    StepCommands.update(activeId, {
                                        stepId: change.id as Guid,
                                        changes: { x: newX, y: newY },
                                        previousState: step as any,
                                    })
                                );
                            }
                        }
                    }

                    // Очищаем из кеша
                    dragStartPositionsRef.current.delete(change.id);
                }

                // Удаление node
                if (change.type === 'remove') {
                    dragStartPositionsRef.current.delete(change.id);
                }

                // Изменение размеров (для веток) - ТОЛЬКО при resizing: false
                if (change.type === 'dimensions' && change.dimensions && change.resizing === false) {
                    const node = nodesRef.current.find((n) => n.id === change.id);
                    if (!node) continue;

                    const isBranch = node.type === 'branchNode' || node.type === FlowType.branchNode;

                    if (isBranch && commandDispatcher && activeId) {
                        const state = store.getState();
                        const branch = state.scenario.branches.entities[change.id];

                        if (branch && change.dimensions.width && change.dimensions.height) {
                            const newWidth = Math.round(change.dimensions.width);
                            const newHeight = Math.round(change.dimensions.height);

                            if (branch.width !== newWidth || branch.height !== newHeight) {
                                commandDispatcher.execute(
                                    BranchCommands.resize(activeId, {
                                        branchId: change.id as Guid,
                                        width: newWidth,
                                        height: newHeight,
                                        previousWidth: branch.width,
                                        previousHeight: branch.height,
                                    })
                                );
                            }
                        }
                    }
                }
            }
        },
        [commandDispatcher, activeId]
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

    // Пересборка графа при изменении версии
    useEffect(() => {
        if (!activeScenario) {
            setNodes([]);
            setEdges([]);
            dragStartPositionsRef.current.clear();
            return;
        }
        const { nodes: n, edges: e } = mapScenarioToFlow(activeScenario);
        setNodes(n);
        setEdges(e);
    }, [scenarioVersion, activeScenario]);

    // Доступ к RF
    const rf = useReactFlow<FlowNode, FlowEdge>();

    // Подгон вида и валидация размеров веток
    useFitViewOnVersion(rf as any, scenarioVersion);
    useBranchSizeValidation(rf as any);

    // Helpers
    const getAll = useCallback(() => rf.getNodes() as FlowNode[], [rf]);

    // Выбор/удаление через команды
    const { selectedNodeIds, selectedEdgeIds, onSelectionChange, deleteSelected } = useSelection({
        setNodes,
        setEdges,
        getNodes: () => nodesRef.current,
        getEdges: () => edgesRef.current,
        onDeleted: ({ nodes, edges }) => {
            if (!commandDispatcher || !activeId) return;

            commandDispatcher.startBatch();

            for (const n of nodes) {
                const isBranch = n.type === 'branchNode' || n.type === FlowType.branchNode;
                const state = store.getState();

                if (isBranch) {
                    const branch = state.scenario.branches.entities[n.id];
                    if (branch) {
                        commandDispatcher.execute(
                            BranchCommands.delete(activeId, {
                                branchId: n.id as Guid,
                                previousState: branch as any,
                            })
                        );
                    }
                } else {
                    const step = state.scenario.steps.entities[n.id];
                    if (step) {
                        commandDispatcher.execute(
                            StepCommands.delete(activeId, {
                                stepId: n.id as Guid,
                                previousState: step as any,
                            })
                        );
                    }
                }

                dragStartPositionsRef.current.delete(n.id);
            }

            for (const e of edges) {
                const state = store.getState();
                const relation = state.scenario.relations.entities[e.id];
                if (relation) {
                    commandDispatcher.execute(
                        RelationCommands.delete(activeId, {
                            relationId: e.id as Guid,
                            previousState: relation,
                        })
                    );
                }
            }

            commandDispatcher.commitBatch('Удалить выбранные элементы');
        },
    });

    // Drag-соединение
    const { onConnectStart, onConnectEnd, getNodeType } = useConnectContext({ rf, setNodes });

    // --- Hover ветки-цели ---
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

    // --- Ctrl-drag ids ---
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

    // Финализация перетаскивания (для сложных случаев: присоединение к ветке)
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
                        if (!commandDispatcher || !activeId) return;

                        const state = store.getState();
                        const step = state.scenario.steps.entities[stepId];
                        const isPersisted = !!(step && (step as any).__persisted);

                        if (isPersisted && step) {
                            commandDispatcher.execute(
                                StepCommands.move(activeId, {
                                    stepId: stepId as Guid,
                                    branchId: branchId as Guid,
                                    x,
                                    y,
                                    previousBranchId: step.branchId,
                                    previousX: step.x,
                                    previousY: step.y,
                                })
                            );
                        } else if (step) {
                            commandDispatcher.execute(
                                StepCommands.create(activeId, {
                                    step: { ...step, branchId, x, y } as any,
                                    branchId: branchId as Guid,
                                })
                            );

                            rf.setNodes((nds) =>
                                nds.map((nn) =>
                                    nn.id === stepId
                                        ? { ...nn, data: { ...nn.data, __persisted: true } }
                                        : nn
                                )
                            );
                        }
                    },

                    onStepMoved: (stepId, x, y) => {
                        // Обработка в onNodesChangeHandler
                    },

                    onStepDetachedFromBranch: (stepId) => {
                        if (!commandDispatcher || !activeId) return;

                        const state = store.getState();
                        const step = state.scenario.steps.entities[stepId];
                        const isPersisted = !!(step && (step as any).__persisted);
                        if (!isPersisted || !step) return;

                        commandDispatcher.execute(
                            StepCommands.delete(activeId, {
                                stepId: stepId as Guid,
                                previousState: step as any,
                            })
                        );

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
        [getAll, setNodes, setHoverBranch, commandDispatcher, activeId, rf]
    );

    const onNodeDragStop = useCallback(dropHandler.onNodeDragStop, [dropHandler]);

    // Соединения через команды
    const connectionHandler = useMemo(
        () => new ConnectionHandler(setEdges, onConnectEnd),
        [setEdges, onConnectEnd]
    );

    const onConnect = useCallback(
        (conn: Connection) => {
            connectionHandler.onConnect(conn);

            if (!commandDispatcher || !activeId || !conn.source || !conn.target) return;

            const newRelation: StepRelationDto = {
                id: crypto.randomUUID() as Guid,
                parentStepId: conn.source as Guid,
                childStepId: conn.target as Guid,
                conditionExpression: null,
                conditionOrder: 0,
            };

            commandDispatcher.execute(
                RelationCommands.create(activeId, {
                    relation: newRelation,
                })
            );
        },
        [connectionHandler, commandDispatcher, activeId]
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
                // ⚡ ИСПРАВЛЕНО: Используем правильные обработчики
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

                <Panel position="top-center">
                    {activeId && <HistoryControls contextId={activeId} />}
                </Panel>

                <Panel position="bottom-right">
                    {activeId && <PendingChangesViewer scenarioId={activeId} />}
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