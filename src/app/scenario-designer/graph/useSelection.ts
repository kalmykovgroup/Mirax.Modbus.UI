import React, { useCallback, useEffect, useState } from 'react';
import type { Edge } from '@xyflow/react';
import type { FlowNode, FlowEdge } from '@app/scenario-designer/types/FlowNode.ts';

type Props = {
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
    setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
};

export function useSelection({ setNodes, setEdges }: Props) {
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

    const onSelectionChange = useCallback(
        ({ nodes: selNodes, edges: selEdges }: { nodes: FlowNode[]; edges: Edge[] }) => {
            setSelectedNodeIds(new Set(selNodes.map((n) => n.id)));
            setSelectedEdgeIds(new Set(selEdges.map((e) => e.id)));
        },
        []
    );

    const deleteSelected = useCallback(() => {
        if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

        setEdges((eds) =>
            eds.filter(
                (e) =>
                    !selectedEdgeIds.has(e.id) &&
                    !selectedNodeIds.has(e.source) &&
                    !selectedNodeIds.has(e.target)
            )
        );

        setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));

        setSelectedNodeIds(new Set());
        setSelectedEdgeIds(new Set());
    }, [selectedNodeIds, selectedEdgeIds, setEdges, setNodes]);

    // hotkeys: Del/Backspace (кроме текстовых полей)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            const typing =
                !!t &&
                (t.tagName === 'INPUT' ||
                    t.tagName === 'TEXTAREA' ||
                    (t as any).isContentEditable);
            if (typing) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteSelected();
            }
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [deleteSelected]);

    return {
        selectedNodeIds,
        selectedEdgeIds,
        onSelectionChange,
        deleteSelected,
    };
}
