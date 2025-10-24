// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useReduxFlowSync.ts

import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import type { ReactFlowInstance } from '@xyflow/react';

import type { RootState } from '@/baseStore/store';
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';
import { mapScenarioToFlow } from '@scenario/core/mapScenarioToFlow';
import { selectActiveScenarioId } from '@scenario/store/scenarioSelectors';

interface ScenarioData {
    readonly scenarioState: NonNullable<RootState['scenario']['scenarios'][string]>;
}

const makeSelectScenarioData = () =>
    createSelector(
        [
            (state: RootState) => state.scenario.scenarios,
            (_: RootState, scenarioId: string | null) => scenarioId,
        ],
        (scenarios, scenarioId): ScenarioData | null => {
            if (scenarioId == null) return null;
            const scenarioState = scenarios[scenarioId];
            if (scenarioState == null) return null;
            return { scenarioState };
        }
    );

interface UseReduxFlowSyncParams {
    readonly nodesRef: React.RefObject<FlowNode[]>;
    readonly branchSizesRef: React.RefObject<Map<string, { width: number; height: number }>>;
    readonly resizeObserversRef: React.RefObject<Map<string, ResizeObserver>>;
    readonly setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
    readonly setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
    readonly rf: ReactFlowInstance<FlowNode, FlowEdge>;
}

function shallowEqualDto(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        const valA = (a as Record<string, unknown>)[key];
        const valB = (b as Record<string, unknown>)[key];

        if (key === 'childRelations' || key === 'stepBranchRelations') {
            if (Array.isArray(valA) && Array.isArray(valB)) {
                if (valA.length !== valB.length) return false;
                continue;
            }
        }

        if (valA !== valB) return false;
    }

    return true;
}

export function useReduxFlowSync(params: UseReduxFlowSyncParams): string | null {
    const {
        nodesRef,
        branchSizesRef,
        resizeObserversRef,
        setNodes,
        setEdges,
        rf,
    } = params;

    const activeId = useSelector(selectActiveScenarioId);
    const selectScenarioData = useMemo(() => makeSelectScenarioData(), []);
    const scenarioData = useSelector((state: RootState) =>
        selectScenarioData(state, activeId)
    );

    useEffect(() => {
        if (nodesRef.current) {
            nodesRef.current = rf.getNodes();
        }
    });

    useEffect(() => {
        if (scenarioData == null || activeId == null) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const minimalState: RootState = {
            scenario: {
                scenarios: { [activeId]: scenarioData.scenarioState },
                activeScenarioId: activeId,
            },
        } as RootState;

        const flow = mapScenarioToFlow(minimalState, activeId);

        if (nodesRef.current && nodesRef.current.length > 0) {
            const newNodesMap = new Map(flow.nodes.map((n) => [n.id, n]));
            const currentNodesMap = new Map(nodesRef.current.map((n) => [n.id, n]));

            setNodes((prevNodes) => {
                const updated = prevNodes
                    .map((currentNode) => {
                        const newNode = newNodesMap.get(currentNode.id);

                        if (newNode == null) {
                            return null;
                        }

                        const needsUpdate =
                            currentNode.position.x !== newNode.position.x ||
                            currentNode.position.y !== newNode.position.y ||
                            currentNode.style?.width !== newNode.style?.width ||
                            currentNode.style?.height !== newNode.style?.height ||
                            !shallowEqualDto(currentNode.data.object, newNode.data.object);

                        if (!needsUpdate) {
                            return currentNode;
                        }

                        return newNode;
                    })
                    .filter((n): n is FlowNode => n != null);

                for (const newNode of flow.nodes) {
                    if (!currentNodesMap.has(newNode.id)) {
                        console.log(`[ReduxFlowSync] ➕ Adding new node ${newNode.id}`);
                        updated.push(newNode);
                    }
                }

                return updated;
            });
        } else {
            setNodes(Array.from(flow.nodes));
        }

        setEdges(Array.from(flow.edges));

        if (branchSizesRef.current && resizeObserversRef.current) {
            for (const node of flow.nodes) {
                if (node.type === 'BranchNode') {
                    const current = branchSizesRef.current.get(node.id);
                    const newWidth = typeof node.style?.width === 'number' ? node.style.width : 0;
                    const newHeight = typeof node.style?.height === 'number' ? node.style.height : 0;

                    if (current == null || current.width !== newWidth || current.height !== newHeight) {
                        branchSizesRef.current.set(node.id, {
                            width: newWidth,
                            height: newHeight,
                        });
                    }

                    if (!resizeObserversRef.current.has(node.id)) {
                        const observer = new ResizeObserver((entries) => {
                            for (const entry of entries) {
                                const newW = Math.round(entry.contentRect.width);
                                const newH = Math.round(entry.contentRect.height);
                                const stored = branchSizesRef.current?.get(node.id);

                                if (stored == null || stored.width !== newW || stored.height !== newH) {
                                    branchSizesRef.current?.set(node.id, {
                                        width: newW,
                                        height: newH,
                                    });
                                }
                            }
                        });

                        resizeObserversRef.current.set(node.id, observer);

                        requestAnimationFrame(() => {
                            const el = document.querySelector(`[data-id="${node.id}"]`);
                            if (el) observer.observe(el);
                        });
                    }
                }
            }
        }

        console.log('[ReduxFlowSync] ✅ Sync complete', {
            nodes: flow.nodes.length,
            edges: flow.edges.length,
        });
    }, [
        scenarioData,
        activeId,
        setNodes,
        setEdges,
        branchSizesRef,
        resizeObserversRef,
        nodesRef,
    ]);

    useEffect(() => {
        const observers = resizeObserversRef.current;
        return () => {
            if (observers) {
                for (const observer of observers.values()) {
                    observer.disconnect();
                }
                observers.clear();
            }
        };
    }, [resizeObserversRef]);

    return activeId;
}