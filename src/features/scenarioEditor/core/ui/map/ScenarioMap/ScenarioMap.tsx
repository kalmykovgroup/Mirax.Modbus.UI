// src/features/scenarioEditor/core/ui/map/ScenarioMap/ScenarioMap.tsx

import React, { useCallback, useMemo, useState } from 'react';
import {
    Background,
    BackgroundVariant,
    Panel,
    ReactFlow,
    useReactFlow,
    type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import styles from './ScenarioMap.module.css';

import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { RightSidePanel } from '@scenario/core/ui/map/components/RightSidePanel/RightSidePanel';

import { useTheme } from '@app/providers/theme/useTheme';
import { useScenarioOperations } from '@scenario/core/hooks/useScenarioOperations';
import { useSelection } from '@scenario/core/hooks/useSelection';
import { useConnectContext } from '@scenario/core/hooks/useConnectContext';
import { useEdgesRef, useIsValidConnection } from '@scenario/core/hooks/useConnectionValidation';
import { createIsValidConnection } from '@scenario/core/edgeMove/isValidConnection';
import { ALLOW_MAP, TARGET_ALLOW_MAP } from '@scenario/core/edgeMove/connectionRules';
import { NodeDragStopHandler } from '@scenario/core/handlers/NodeDragStopHandler';
import { NodeDragStartHandler } from '@scenario/core/handlers/NodeDragStartHandler';
import {
    absOf,
    rectOf,
    ensureParentBeforeChild,
    pickDeepestBranchByTopLeft,
} from '@scenario/core/utils/dropUtils';
import { useBranchNodeInteractivity } from '@scenario/core/ui/nodes/BranchNode/useBranchNodeInteractivity';

import { useFlowState } from './hooks/useFlowState';
import { useReduxFlowSync } from './hooks/useReduxFlowSync';
import { useNodesChangeHandler } from './hooks/useNodesChangeHandler';
import { useEdgesChangeHandler } from './hooks/useEdgesChangeHandler';
import { useConnectionHandler } from './hooks/useConnectionHandler';
import { useShiftDragMode } from './hooks/useShiftDragMode';
import {edgeTypes, defaultEdgeOptions, flowSettings, generateNodeTypes} from './config/flowConfig';
import { ScenarioOperationsProvider } from './contexts/ScenarioOperationsContext';
import { SaveIndicator } from '@scenario/core/ui/map/components/SaveIndicator/SaveIndicator';
import { ManualSaveButton } from '@scenario/core/ui/map/components/ManualSaveButton/ManualSaveButton';
import { LockButton } from '@scenario/core/ui/map/components/LockButton/LockButton';
import { NodeContextMenu, useNodeContextMenu, initializeNodeContextMenuProviders } from '@scenario/core/ui/nodes/shared/NodeContextMenu';
import { NodeEditModalProvider } from '@scenario/core/ui/nodes/shared/NodeEditModal';
import { useHistoryHotkeys } from '@scenario/core/hooks/useHistoryHotkeys';
import { useDispatch, useSelector } from 'react-redux';
import { undoThunk, redoThunk, selectCanUndo, selectCanRedo } from '@scenario/core/features/historySystem/historySlice';
import { selectIsLocked } from '@scenario/core/features/lockSystem/lockSlice';
import type { AppDispatch, RootState } from '@/baseStore/store';


type RightSidePanelTab = 'create' | 'settings' | 'scenarios';
export interface ScenarioEditorProps {}

export const ScenarioMap: React.FC<ScenarioEditorProps> = () => {
    const { theme } = useTheme();
    const rf = useReactFlow<FlowNode, FlowEdge>();
    const dispatch = useDispatch<AppDispatch>();
    const isLocked = useSelector(selectIsLocked);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const nodeTypes = useMemo(() => generateNodeTypes(), []); // ✅ ИСПРАВЛЕНИЕ
    // ============================================================================
    // RIGHT SIDE PANEL STATE
    // ============================================================================
    const [rightPanelActiveTab, setRightPanelActiveTab] = useState<RightSidePanelTab | null>(null);


    // ============================================================================
    // STATE & REFS
    // ============================================================================
    const { nodes, edges, setNodes, setEdges, setHoverBranch, refs } = useFlowState();

    // ============================================================================
    // REDUX SYNC
    // ============================================================================
    const activeId = useReduxFlowSync({
        nodesRef: refs.nodesRef,
        branchSizesRef: refs.branchSizesRef,
        resizeObserversRef: refs.resizeObserversRef,
        setNodes,
        setEdges,
        rf,
    });

    // ============================================================================
    // OPERATIONS
    // ============================================================================
    const operations = useScenarioOperations(activeId);

    // ============================================================================
    // CONTEXT MENU
    // ============================================================================
    const contextMenu = useNodeContextMenu();

    // Инициализируем провайдеры контекстного меню с обработчиком удаления
    React.useEffect(() => {
        initializeNodeContextMenuProviders((node: FlowNode) => {
            // Обработчик удаления ноды
            if (node.data.__persisted === true) {
                operations.deleteNode(node);
            } else {
                // Для неперсистентных нод просто удаляем из состояния
                setNodes((nds) => nds.filter((n) => n.id !== node.id));
            }

            // Закрываем меню после удаления
            contextMenu.closeMenu();
        });
    }, [operations, setNodes, contextMenu]);

    // ============================================================================
    // CONNECTION CONTEXT
    // ============================================================================
    const { onConnectStart, onConnectEnd, getNodeType } = useConnectContext({
        rf,
        setNodes,
    });

    const edgesRef = useEdgesRef(edges);
    const isValidConnection = useIsValidConnection(
        getNodeType,
        () => edgesRef.current,
        createIsValidConnection,
        ALLOW_MAP,
        TARGET_ALLOW_MAP
    );

    // ============================================================================
    // HANDLERS
    // ============================================================================
    const onNodesChangeHandler = useNodesChangeHandler({
        refs,
        setNodes,
        operations,
    });

    const onEdgesChangeHandler = useEdgesChangeHandler({ setEdges, operations });

    const { onConnect } = useConnectionHandler({
        rf,
        setNodes,
        setEdges,
        operations,
        onConnectEnd,
    });

    // ============================================================================
    // DRAG HANDLERS
    // ============================================================================
    const dragStartHandler = useMemo(
        () =>
            new NodeDragStartHandler({
                shiftDragIdsRef: refs.shiftDragIdsRef,
            }),
        [refs.shiftDragIdsRef]
    );

    const dragStopHandlerInstance = useMemo(
        () =>
            new NodeDragStopHandler({
                getAll: rf.getNodes,
                getAllEdges: rf.getEdges,
                setNodes,
                setEdges,
                setHoverBranch,
                shiftDragIdsRef: refs.shiftDragIdsRef,
                isBatchMoveRef: refs.isBatchMoveRef, // ✅ ДОБАВЛЕНО
                utils: {
                    absOf,
                    rectOf,
                    ensureParentBeforeChild,
                    pickDeepestBranchByTopLeft,
                },
                callbacks: {
                    onStepMoved: (
                        stepId: string,
                        x: number,
                        y: number,
                        branchResize?: {
                            branchId: string;
                            width: number;
                            height: number;
                            newX?: number;
                            newY?: number;
                        }
                    ) => {
                        console.log(`[ScenarioMap] 📍 STEP MOVED | ID: ${stepId}`, { x, y, branchResize });
                        const stepNode = rf.getNodes().find((n) => n.id === stepId);
                        if (!stepNode) return;

                        // ✅ ВСЕГДА используем batch для одиночного перемещения
                        // Это позволяет захватить автоматическое уменьшение/расширение ветки из BranchNode.useEffect
                        operations.startBatch();
                        console.log(`[ScenarioMap] ✅ Batch started for single node move`);

                        // Перемещаем ноду
                        operations.moveNode(stepNode, x, y);
                        console.log(`[ScenarioMap] ✅ Step moved in batch`);

                        // Если нужно расширить ветку - добавляем это в batch
                        if (branchResize) {
                            const branchNode = rf.getNodes().find((n) => n.id === branchResize.branchId);
                            if (branchNode) {
                                console.log(`[ScenarioMap] 📦 Adding branch resize to batch`, {
                                    branchId: branchResize.branchId,
                                    newSize: { w: branchResize.width, h: branchResize.height },
                                    newPos: { x: branchResize.newX, y: branchResize.newY }
                                });

                                operations.autoExpandBranch(
                                    branchNode,
                                    branchResize.width,
                                    branchResize.height,
                                    branchResize.newX,
                                    branchResize.newY
                                );
                                console.log(`[ScenarioMap] ✅ Branch resized in batch`);
                            } else {
                                console.warn(`[ScenarioMap] ⚠️ Branch node not found: ${branchResize.branchId}`);
                            }
                        }

                        // Коммитим batch с небольшой задержкой, чтобы BranchNode.useEffect успел добавить уменьшение
                        setTimeout(() => {
                            operations.commitBatch('Перемещение ноды');
                            console.log(`[ScenarioMap] ✅ Batch committed (with delay for branch auto-resize)`);
                        }, 10);
                    },
                    onStepAttachedToBranch: (stepId: string, branchId: string, x: number, y: number) => {
                        console.log(
                            `[ScenarioMap] 📌 STEP ATTACHED | Step: ${stepId} → Branch: ${branchId}`,
                            { x, y }
                        );
                        const stepNode = rf.getNodes().find((n) => n.id === stepId);
                        if (stepNode) {
                            operations.attachStepToBranch(stepNode, branchId, x, y);
                        }
                    },
                    onStepDetachedFromBranch: (stepId: string) => {
                        console.log(`[ScenarioMap] 🔓 STEP DETACHED TO FREE SPACE | ID: ${stepId} | This means DELETE`);
                        const stepNode = rf.getNodes().find((n) => n.id === stepId);
                        if (stepNode) {
                            // Вынос ноды на свободное пространство = УДАЛЕНИЕ ноды
                            // NodeDragStopHandler уже удалил связи визуально через removeNodeConnections
                            // Нам нужно удалить ноду и записать удаление связей в историю
                            operations.deleteNode(stepNode);
                        }
                    },
                },
            }),
        [rf, setNodes, setEdges, setHoverBranch, operations, refs.shiftDragIdsRef]
    );

    // Обертка для drag stop handler
    const dragStopHandler = useMemo(
        () => ({
            onNodeDragStop: (e: React.MouseEvent | React.TouchEvent, node: FlowNode) => {
                dragStopHandlerInstance.onNodeDragStop(e, node);
            },
        }),
        [dragStopHandlerInstance]
    );

    // ============================================================================
    // SELECTION
    // ============================================================================
    const { onSelectionChange /*deleteSelected*/ } = useSelection({
        setNodes,
        setEdges,
        getNodes: rf.getNodes,
        getEdges: rf.getEdges,
        onDeleted: (payload) => {
            // Удаляем ноды (deleteNode автоматически удалит связи этих нод через batch)
            for (const node of payload.nodes) {
                if (node.data.__persisted === true) {
                    operations.deleteNode(node);
                }
            }

            // Удаляем только те связи, которые НЕ связаны с удаляемыми нодами
            // (связи нод уже удалены в deleteNode)
            const deletedNodeIds = new Set(payload.nodes.map(n => n.id));
            for (const edge of payload.edges) {
                // Если оба конца связи НЕ удаляются, значит это самостоятельное удаление связи
                if (!deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target)) {
                    operations.deleteRelation(edge.id);
                }
            }
        },
    });

    const handleSelectionChange = useCallback(
        (params: OnSelectionChangeParams): void => {
            onSelectionChange({
                nodes: params.nodes as FlowNode[],
                edges: params.edges as FlowEdge[],
            });
        },
        [onSelectionChange]
    );

    // ============================================================================
    // SHIFT MODE
    // ============================================================================
    useShiftDragMode({
        nodes,
        rf,
        shiftDragIdsRef: refs.shiftDragIdsRef,
    });

    // ============================================================================
    // BRANCH INTERACTIVITY
    // ============================================================================
    useBranchNodeInteractivity();

    // ============================================================================
    // HISTORY HOTKEYS (Undo/Redo)
    // ============================================================================
    const canUndo = useSelector((state: RootState) => selectCanUndo(state, activeId ?? ''));
    const canRedo = useSelector((state: RootState) => selectCanRedo(state, activeId ?? ''));

    const handleUndo = useCallback(() => {
        if (canUndo && activeId) {
            dispatch(undoThunk({ contextId: activeId }));
        }
    }, [dispatch, activeId, canUndo]);

    const handleRedo = useCallback(() => {
        if (canRedo && activeId) {
            dispatch(redoThunk({ contextId: activeId }));
        }
    }, [dispatch, activeId, canRedo]);

    // Регистрируем горячие клавиши глобально для всего редактора сценариев
    useHistoryHotkeys({
        onUndo: handleUndo,
        onRedo: handleRedo,
    }, !!activeId); // Включены только если есть активный сценарий

    // ============================================================================
    // EDGE HOVER
    // ============================================================================
    const handleEdgeMouseEnter = useCallback(
        (_: unknown, edge: FlowEdge): void =>
            setEdges((es) =>
                es.map((e): FlowEdge =>
                    e.id === edge.id ? { ...e, data: { ...e.data, __hovered: true } } : e
                )
            ),
        [setEdges]
    );

    const handleEdgeMouseLeave = useCallback(
        (_: unknown, edge: FlowEdge): void =>
            setEdges((es) =>
                es.map((e): FlowEdge =>
                    e.id === edge.id ? { ...e, data: { ...e.data, __hovered: false } } : e
                )
            ),
        [setEdges]
    );

    // ============================================================================
    // NODE CONTEXT MENU (Right Click)
    // ============================================================================
    const handleNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: FlowNode): void => {
            event.preventDefault(); // Предотвращаем стандартное контекстное меню браузера

            // Выделяем ноду при открытии контекстного меню
            setNodes((nds) =>
                nds.map((n) => ({
                    ...n,
                    selected: n.id === node.id,
                }))
            );

            // Получаем позицию клика
            const position = {
                x: event.clientX,
                y: event.clientY,
            };

            contextMenu.openMenu(node, position);
        },
        [contextMenu, setNodes]
    );



    // ============================================================================
    // RENDER
    // ============================================================================
    return (
        <div ref={containerRef} data-theme={theme} className={styles.containerScenarioMap} style={{ height: '70vh' }}>
            <ScenarioOperationsProvider operations={operations}>
                <NodeEditModalProvider>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onEdgeMouseEnter={handleEdgeMouseEnter}
                    onEdgeMouseLeave={handleEdgeMouseLeave}
                    onNodesChange={onNodesChangeHandler}
                    onEdgesChange={onEdgesChangeHandler}
                    onSelectionChange={handleSelectionChange}
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd}
                    isValidConnection={isValidConnection}
                    onNodeDragStart={dragStartHandler.onNodeDragStart}
                    onNodeDragStop={dragStopHandler.onNodeDragStop}
                    onNodeContextMenu={handleNodeContextMenu}
                    proOptions={{ hideAttribution: true }}
                    {...flowSettings}
                    defaultEdgeOptions={defaultEdgeOptions}
                    className={styles.customFlow}
                    nodesDraggable={!isLocked}
                    nodesConnectable={!isLocked}
                    nodesFocusable={!isLocked}
                    edgesFocusable={!isLocked}
                    elementsSelectable={!isLocked}
                >
                <Panel className={styles.topLeftPanel} position="top-left">
                    <div className={styles.flowControls} >
                        <LockButton />
                    </div>

                </Panel>

                <Panel className={styles.rightTopPanel} position="top-right">
                    <ManualSaveButton scenarioId={activeId} />
                    <RightSidePanel
                        activeTab={rightPanelActiveTab}
                        onTabChange={setRightPanelActiveTab}
                        containerRef={containerRef}
                    />
                </Panel>

                <Panel className={styles.bottomRightPanel}  position="bottom-right">
                    <SaveIndicator />
                </Panel>
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

                {/* Context Menu */}
                {contextMenu.state.isOpen && contextMenu.state.node && contextMenu.state.position && (
                    <NodeContextMenu
                        node={contextMenu.state.node}
                        actions={contextMenu.state.actions}
                        position={contextMenu.state.position}
                        onClose={contextMenu.closeMenu}
                    />
                )}
            </ReactFlow>
                </NodeEditModalProvider>
            </ScenarioOperationsProvider>
        </div>
    );
};