// src/features/scenarioEditor/core/ui/map/ScenarioMap/hooks/useFlowState.ts

import React, { useRef, useState } from 'react';
import type { FlowEdge, FlowNode } from '@scenario/shared/contracts/models/FlowNode.ts';

interface DragState {
    readonly x: number;
    readonly y: number;
}

interface ResizeState {
    readonly width: number;
    readonly height: number;
}

export interface FlowStateRefs {
    readonly nodesRef: React.RefObject<FlowNode[]>;
    readonly dragStateRef: React.RefObject<Map<string, DragState>>;
    readonly resizeStateRef: React.RefObject<Map<string, ResizeState>>;
    readonly branchSizesRef: React.RefObject<Map<string, ResizeState>>;
    readonly resizeObserversRef: React.RefObject<Map<string, ResizeObserver>>;
    readonly isDraggingRef: React.RefObject<boolean>;
    readonly isDraggingBranchRef: React.RefObject<boolean>;
    readonly pendingBranchResizeRef: React.RefObject<Map<string, { from: ResizeState; to: ResizeState }>>;

readonly skipSyncRef: React.RefObject<boolean>;
readonly shiftDragIdsRef: React.RefObject<Set<string>>;
readonly draggingParentIdsRef: React.RefObject<Set<string>>;
readonly isBatchMoveRef: React.RefObject<boolean>; // для отключения NodeDragStopHandler при батчинге
}

export interface FlowState {
    readonly nodes: FlowNode[];
    readonly edges: FlowEdge[];
    readonly hoverBranch: string | undefined;
    readonly setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
    readonly setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
    readonly setHoverBranch: React.Dispatch<React.SetStateAction<string | undefined>>;
    readonly refs: FlowStateRefs;
}

export function useFlowState(): FlowState {
    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [edges, setEdges] = useState<FlowEdge[]>([]);
    const [hoverBranch, setHoverBranch] = useState<string | undefined>();

    const nodesRef = useRef<FlowNode[]>([]);
    const dragStateRef = useRef<Map<string, DragState>>(new Map());
    const resizeStateRef = useRef<Map<string, ResizeState>>(new Map());
    const branchSizesRef = useRef<Map<string, ResizeState>>(new Map());
    const resizeObserversRef = useRef<Map<string, ResizeObserver>>(new Map());

    const isDraggingRef = useRef<boolean>(false);
    const isDraggingBranchRef = useRef<boolean>(false);
    const pendingBranchResizeRef = useRef<Map<string, { from: ResizeState; to: ResizeState }>>(
        new Map()
    );

    const skipSyncRef = useRef<boolean>(false);
    const shiftDragIdsRef = useRef<Set<string>>(new Set());
    const draggingParentIdsRef = useRef<Set<string>>(new Set());
    const isBatchMoveRef = useRef<boolean>(false); // для отключения NodeDragStopHandler

    return {
        nodes,
        edges,
        hoverBranch,
        setNodes,
        setEdges,
        setHoverBranch,
        refs: {
            nodesRef,
            dragStateRef,
            resizeStateRef,
            branchSizesRef,
            resizeObserversRef,
            isDraggingRef,
            isDraggingBranchRef,
            pendingBranchResizeRef,
            skipSyncRef,
            shiftDragIdsRef,
            draggingParentIdsRef,
            isBatchMoveRef,
        },
    };
}