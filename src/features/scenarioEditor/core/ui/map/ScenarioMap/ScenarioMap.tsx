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
} from '@scenario/store/scenarioSelectors';
import {
    refreshScenarioById,
    ScenarioLoadState,
    deleteStep,
    deleteBranch,
    deleteRelation,
    addRelation,
    addStep,
} from '@scenario/store/scenarioSlice';
import {generateNodeTypes} from "@scenario/core/utils/generateNodeTypes.ts";
import {NodeUpdateService} from "@scenario/core/features/NodeUpdateService.ts";

export interface ScenarioEditorProps {}

export const ScenarioMap: React.FC<ScenarioEditorProps> = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { theme } = useTheme();

    const updateService = useMemo(() => new NodeUpdateService(dispatch), [dispatch]);

    // ✅ Используем FlowNode и FlowEdge везде
    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [edges, setEdges] = useState<FlowEdge[]>([]);

    const edgesRef = useEdgesRef(edges);
    const nodesRef = useRef<FlowNode[]>([]);

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    const nodeTypes = useMemo(() => generateNodeTypes(), []);

    const activeId = useSelector(selectActiveScenarioId);
    const scenarioMeta = useSelector((state: RootState) =>
        activeId ? selectScenarioById(state, activeId) : null
    );
    const activeScenario = useSelector((state: RootState) =>
        activeId ? selectDenormalizedScenario(state, activeId) : null
    );

    const dragStartStatesRef = useRef<Map<string, { position: { x: number; y: number } }>>(new Map());
    const resizeStartStatesRef = useRef<Map<string, { size: { width: number; height: number } }>>(new Map());

    // ============================================================================
    // СИНХРОНИЗАЦИЯ Redux → ReactFlow
    // ============================================================================

    useEffect(() => {
        if (!activeScenario) {
            setNodes([]);
            setEdges([]);
            dragStartStatesRef.current.clear();
            resizeStartStatesRef.current.clear();
            return;
        }

        const { nodes: mappedNodes, edges: mappedEdges } = mapScenarioToFlow(activeScenario);

        // ✅ Типы уже совпадают
        setNodes(mappedNodes);
        setEdges(mappedEdges);
    }, [activeScenario]);

    // ============================================================================
    // ОБРАБОТЧИКИ
    // ============================================================================

    const handleDragStart = useCallback((nodeId: string, x: number, y: number) => {
        dragStartStatesRef.current.set(nodeId, { position: { x, y } });
    }, []);

    const handleDragEnd = useCallback(
        (nodeId: string, newX: number, newY: number) => {
            const startState = dragStartStatesRef.current.get(nodeId);
            if (!startState) return;

            const { position: startPos } = startState;
            if (startPos.x === newX && startPos.y === newY) {
                dragStartStatesRef.current.delete(nodeId);
                return;
            }

            const node = nodesRef.current.find((n) => n.id === nodeId);
            if (!node) {
                dragStartStatesRef.current.delete(nodeId);
                return;
            }

            // ✅ node уже FlowNode
            updateService.updateNodePosition(node, newX, newY);
            dragStartStatesRef.current.delete(nodeId);
        },
        [updateService]
    );

    const handleResizeStart = useCallback((nodeId: string, width: number, height: number) => {
        resizeStartStatesRef.current.set(nodeId, { size: { width, height } });
    }, []);

    const handleResizeEnd = useCallback(
        (nodeId: string, newWidth: number, newHeight: number) => {
            const startState = resizeStartStatesRef.current.get(nodeId);
            if (!startState) return;

            const { size: startSize } = startState;
            if (startSize.width === newWidth && startSize.height === newHeight) {
                resizeStartStatesRef.current.delete(nodeId);
                return;
            }

            const node = nodesRef.current.find((n) => n.id === nodeId);
            if (!node) {
                resizeStartStatesRef.current.delete(nodeId);
                return;
            }

            // ✅ node уже FlowNode
            updateService.updateNodeSize(node, newWidth, newHeight);
            resizeStartStatesRef.current.delete(nodeId);
        },
        [updateService]
    );

    const onNodesChangeHandler: OnNodesChange<FlowNode> = useCallback(
        (changes: NodeChange<FlowNode>[]) => {
            setNodes((nds) => applyNodeChanges(changes, nds));

            for (const change of changes) {
                if (change.type === 'position') {
                    if (change.dragging === true && change.position) {
                        handleDragStart(
                            change.id,
                            Math.round(change.position.x),
                            Math.round(change.position.y)
                        );
                    } else if (change.dragging === false && change.position) {
                        handleDragEnd(
                            change.id,
                            Math.round(change.position.x),
                            Math.round(change.position.y)
                        );
                    }
                }

                if (change.type === 'dimensions' && change.dimensions) {
                    if (change.resizing === true) {
                        handleResizeStart(
                            change.id,
                            Math.round(change.dimensions.width),
                            Math.round(change.dimensions.height)
                        );
                    } else if (change.resizing === false) {
                        handleResizeEnd(
                            change.id,
                            Math.round(change.dimensions.width),
                            Math.round(change.dimensions.height)
                        );
                    }
                }

                if (change.type === 'remove') {
                    dragStartStatesRef.current.delete(change.id);
                    resizeStartStatesRef.current.delete(change.id);
                }
            }
        },
        [handleDragStart, handleDragEnd, handleResizeStart, handleResizeEnd]
    );

    const onEdgesChangeHandler = useCallback(
        (changes: EdgeChange<FlowEdge>[]) => {
            setEdges((eds) => applyEdgeChanges(changes, eds));

            if (!activeId) return;

            for (const ch of changes) {
                if (ch.type === 'remove' && ch.id) {
                    const edge = edgesRef.current.find((e) => e.id === ch.id);
                    if (!edge) continue;

                    const state = store.getState();
                    const relation = state.scenario.relations.entities[edge.id];

                    if (relation) {
                        dispatch(deleteRelation(edge.id as Guid));
                    }
                }
            }
        },
        [dispatch, activeId, edgesRef]
    );

    // ============================================================================
    // ОСТАЛЬНАЯ ЛОГИКА
    // ============================================================================

    const scenarioVersion = scenarioMeta
        ? `${scenarioMeta.id}:${scenarioMeta.lastFetchedAt ?? 0}:${scenarioMeta.loadState}`
        : 'none';

    useEffect(() => {
        if (!activeId) return;
        if (scenarioMeta?.loadState !== ScenarioLoadState.Full) {
            dispatch(refreshScenarioById(activeId, false)).catch(() => {});
        }
    }, [dispatch, activeId, scenarioMeta?.loadState]);

    const rf = useReactFlow<FlowNode, FlowEdge>();

    useFitViewOnVersion(rf as any, scenarioVersion);
    useBranchSizeValidation(rf as any);

    const getAll = useCallback(() => rf.getNodes() as FlowNode[], [rf]);

    const { selectedNodeIds, selectedEdgeIds, onSelectionChange, deleteSelected } = useSelection({
        setNodes,
        setEdges,
        getNodes: () => nodesRef.current,
        getEdges: () => edgesRef.current,
        onDeleted: ({ nodes: deletedNodes, edges: deletedEdges }) => {
            if (!activeId) return;

            for (const n of deletedNodes) {
                const state = store.getState();

                if (n.type === FlowType.branchNode) {
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

                dragStartStatesRef.current.delete(n.id);
                resizeStartStatesRef.current.delete(n.id);
            }

            for (const e of deletedEdges) {
                const state = store.getState();
                const relation = state.scenario.relations.entities[e.id];
                if (relation) {
                    dispatch(deleteRelation(e.id as Guid));
                }
            }
        },
    });

    const { onConnectStart, onConnectEnd, getNodeType: getNodeTypeConnect } = useConnectContext({
        rf,
        setNodes,
    });

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

    const ctrlDragIdsRef = useRef<Set<string>>(new Set());

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
                            const node = nodesRef.current.find((n) => n.id === stepId);
                            if (node) {
                                updateService.updateNodeData(node, { branchId, x, y });
                            }
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

                    onStepMoved: () => {},

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

                        dragStartStatesRef.current.delete(stepId);
                    },

                    onBranchResized: () => {},
                },
            }),
        [getAll, setNodes, setHoverBranch, dispatch, activeId, rf, updateService]
    );

    const onNodeDragStop = useCallback(dropHandler.onNodeDragStop, [dropHandler]);

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

    const isValidConnection: IsValidConnection<FlowEdge> = useIsValidConnection(
        getNodeTypeConnect,
        () => edgesRef.current,
        createIsValidConnection,
        ALLOW_MAP,
        TARGET_ALLOW_MAP
    );

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