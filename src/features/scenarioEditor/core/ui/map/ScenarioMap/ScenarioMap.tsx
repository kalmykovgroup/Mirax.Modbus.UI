// src/features/scenarioEditor/core/ui/map/ScenarioMap/ScenarioMap.tsx

import React, { useCallback, useMemo } from 'react';
import {
    Background,
    BackgroundVariant,
    Controls,
    Panel,
    ReactFlow,
    useReactFlow,
    type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import styles from './ScenarioMap.module.css';

import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { RightPanel } from '@scenario/core/ui/map/RightPanel/RightPanel';
import LeftPanel from '@scenario/core/ui/map/LeftPanel/LeftPanel';

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

export interface ScenarioEditorProps {}

export const ScenarioMap: React.FC<ScenarioEditorProps> = () => {
    const { theme } = useTheme();
    const rf = useReactFlow<FlowNode, FlowEdge>();

    const nodeTypes = useMemo(() => generateNodeTypes(), []); // ✅ ИСПРАВЛЕНИЕ

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

    const dragStopHandler = useMemo(
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
                    onStepMoved: (stepId: string, x: number, y: number) => {
                        console.log(`[ScenarioMap] 📍 STEP MOVED | ID: ${stepId}`, { x, y });
                        const stepNode = rf.getNodes().find((n) => n.id === stepId);
                        if (stepNode) {
                            operations.moveNode(stepNode, x, y);
                        }
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
                        console.log(`[ScenarioMap] 🔓 STEP DETACHED | ID: ${stepId}`);
                        const stepNode = rf.getNodes().find((n) => n.id === stepId);
                        if (stepNode) {
                            const x = stepNode.position.x;
                            const y = stepNode.position.y;
                            operations.detachStepFromBranch(stepNode, x, y);
                        }
                    },
                    onBranchResized: (
                        branchId: string,
                        width: number,
                        height: number,
                        newX?: number,
                        newY?: number
                    ) => {
                        console.log(
                            `[ScenarioMap] 📐 BRANCH RESIZED | Branch: ${branchId}`,
                            { width, height, x: newX, y: newY }
                        );
                        const branchNode = rf.getNodes().find((n) => n.id === branchId);
                        if (branchNode) {
                            // Обновляем ветку (включая координаты если изменились)
                            operations.autoExpandBranch(branchNode, width, height, newX, newY);

                            // Дочерние степы обновятся автоматически через useReduxFlowSync
                            // при следующей синхронизации, т.к. их относительные координаты
                            // будут пересчитаны в mapScenarioToFlow
                        }
                    },
                },
            }),
        [rf, setNodes, setEdges, setHoverBranch, operations, refs.shiftDragIdsRef]
    );

    // ============================================================================
    // SELECTION
    // ============================================================================
    const { onSelectionChange, deleteSelected } = useSelection({
        setNodes,
        setEdges,
        getNodes: rf.getNodes,
        getEdges: rf.getEdges,
        onDeleted: (payload) => {
            // Удаляем ноды
            for (const node of payload.nodes) {
                if (node.data.__persisted === true) {
                    operations.deleteNode(node);
                }
            }

            // Удаляем связи
            for (const edge of payload.edges) {
                operations.deleteRelation(edge.id);
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
    // RENDER
    // ============================================================================
    return (
        <div data-theme={theme} className={styles.containerScenarioMap} style={{ height: '70vh' }}>
            <ScenarioOperationsProvider operations={operations}>
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
                    {...flowSettings}
                    defaultEdgeOptions={defaultEdgeOptions}
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
            </ScenarioOperationsProvider>
        </div>
    );
};