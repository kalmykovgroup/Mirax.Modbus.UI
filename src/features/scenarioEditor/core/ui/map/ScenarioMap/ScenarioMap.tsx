// src/features/scenarioEditor/core/ui/map/ScenarioMap/ScenarioMap.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Background,
    BackgroundVariant,
    ConnectionLineType,
    Controls,
    type EdgeChange,
    MarkerType,
    type NodeChange,
    Panel,
    ReactFlow,
    SelectionMode,
    useReactFlow,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSelector } from 'react-redux';

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

export interface ScenarioEditorProps {}

interface DragState {
    readonly x: number;
    readonly y: number;
}

interface ResizeState {
    readonly width: number;
    readonly height: number;
}

export const ScenarioMap: React.FC<ScenarioEditorProps> = () => {
    const { theme } = useTheme();

    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [edges, setEdges] = useState<FlowEdge[]>([]);

    const dragStateRef = useRef<Map<string, DragState>>(new Map());
    const resizeStateRef = useRef<Map<string, ResizeState>>(new Map());
    const nodesRef = useRef<FlowNode[]>([]);

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    const nodeTypes = useMemo(() => generateNodeTypes(), []);

    const activeId = useSelector(selectActiveScenarioId);
    const state = useSelector((s: RootState) => s);

    // Синхронизация Redux → ReactFlow
    useEffect(() => {
        if (activeId == null) {
            console.log('[ScenarioMap] No active scenario');
            setNodes([]);
            setEdges([]);
            dragStateRef.current.clear();
            resizeStateRef.current.clear();
            return;
        }

        const scenario = state.scenario.scenarios[activeId];
        if (scenario == null) {
            console.log('[ScenarioMap] Scenario not found in state:', activeId);
            setNodes([]);
            setEdges([]);
            return;
        }

        console.log('[ScenarioMap] Mapping scenario to flow:', activeId);
        console.log('[ScenarioMap] Scenario data:', scenario);
        console.log('[ScenarioMap] Branches count:', Object.keys(state.scenario.branches).length);
        console.log('[ScenarioMap] Steps count:', Object.keys(state.scenario.steps).length);

        try {
            const flow = mapScenarioToFlow(state, activeId);
            console.log('[ScenarioMap] Flow result:', {
                nodesCount: flow.nodes.length,
                edgesCount: flow.edges.length,
            });
            setNodes(flow.nodes as FlowNode[]);
            setEdges(flow.edges as FlowEdge[]);
        } catch (error) {
            console.error('[ScenarioMap] Error mapping scenario:', error);
        }
    }, [state, activeId]);

    const onNodesChangeHandler = useCallback((changes: NodeChange[]): void => {
        setNodes((nds) => applyNodeChanges(changes, nds));

        for (const change of changes) {
            if (change.type === 'position' && 'position' in change && change.position != null) {
                const { id, position, dragging } = change;

                if (dragging === true) {
                    dragStateRef.current.set(id, {
                        x: Math.round(position.x),
                        y: Math.round(position.y),
                    });
                } else if (dragging === false) {
                    const startState = dragStateRef.current.get(id);
                    const newX = Math.round(position.x);
                    const newY = Math.round(position.y);

                    if (startState != null && (startState.x !== newX || startState.y !== newY)) {
                        const node = nodesRef.current.find((n) => n.id === id);
                        if (node != null) {
                            console.log('[ScenarioMap] 📍 Position changed:', {
                                nodeId: id,
                                type: node.type,
                                from: startState,
                                to: { x: newX, y: newY },
                            });
                        }
                    }

                    dragStateRef.current.delete(id);
                }
            }

            if (change.type === 'dimensions' && 'dimensions' in change && change.dimensions != null) {
                const { id, dimensions, resizing } = change;

                if (resizing === true) {
                    resizeStateRef.current.set(id, {
                        width: Math.round(dimensions.width),
                        height: Math.round(dimensions.height),
                    });
                } else if (resizing === false) {
                    const startState = resizeStateRef.current.get(id);
                    const newWidth = Math.round(dimensions.width);
                    const newHeight = Math.round(dimensions.height);

                    if (
                        startState != null &&
                        (startState.width !== newWidth || startState.height !== newHeight)
                    ) {
                        const node = nodesRef.current.find((n) => n.id === id);
                        if (node != null) {
                            console.log('[ScenarioMap] 📏 Size changed:', {
                                nodeId: id,
                                type: node.type,
                                from: startState,
                                to: { width: newWidth, height: newHeight },
                            });
                        }
                    }

                    resizeStateRef.current.delete(id);
                }
            }

            if (change.type === 'remove') {
                dragStateRef.current.delete(change.id);
                resizeStateRef.current.delete(change.id);
                console.log('[ScenarioMap] 🗑️ Node removed:', change.id);
            }

            if (change.type === 'add' && 'item' in change) {
                console.log('[ScenarioMap] ➕ Node added:', change.item.id);
            }

            if (change.type === 'select') {
                console.log('[ScenarioMap] 🎯 Node selection changed:', {
                    nodeId: change.id,
                    selected: change.selected,
                });
            }
        }
    }, []);

    const onEdgesChangeHandler = useCallback((changes: EdgeChange[]): void => {
        setEdges((eds) => applyEdgeChanges(changes, eds));

        for (const ch of changes) {
            if (ch.type === 'remove') {
                console.log('[ScenarioMap] 🗑️ Edge removed:', ch.id);
            }

            if (ch.type === 'add' && 'item' in ch) {
                console.log('[ScenarioMap] ➕ Edge added:', {
                    edgeId: ch.item.id,
                    source: ch.item.source,
                    target: ch.item.target,
                });
            }

            if (ch.type === 'select') {
                console.log('[ScenarioMap] 🎯 Edge selection changed:', {
                    edgeId: ch.id,
                    selected: ch.selected,
                });
            }
        }
    }, []);

    const rf = useReactFlow();

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
                        onClick={() => console.log('[ScenarioMap] 🗑️ Delete button clicked')}
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