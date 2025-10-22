// src/features/scenarioEditor/core/hooks/useSelection.ts
import React, { useCallback, useEffect, useState } from 'react';
import type { Edge } from '@xyflow/react';
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode.ts';

type Props = {
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
    setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;

    // Зависимости для получения текущих нод/edges
    getNodes: () => FlowNode[];
    getEdges: () => FlowEdge[];

    // Колбэк: сообщаем наружу ВСЕ удалённые элементы (включая неперсистентные)
    onDeleted?: (payload: { nodes: FlowNode[]; edges: FlowEdge[] }) => void;
};

export function useSelection({ setNodes, setEdges, getNodes, getEdges, onDeleted }: Props) {
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

        // 1) Узнаём, что именно будет удалено
        const nodesBefore = getNodes();
        const edgesBefore = getEdges();

        const toDeleteNodeIds = new Set(selectedNodeIds);
        const toDeleteEdgeIds = new Set(selectedEdgeIds);

        // Рёбра удаляются, если:
        //  - выбрано само ребро, ИЛИ
        //  - удаляется хотя бы одна из его нод (source/target)
        const edgesDeleted = edgesBefore.filter(
            (e) =>
                toDeleteEdgeIds.has(e.id) ||
                toDeleteNodeIds.has(e.source) ||
                toDeleteNodeIds.has(e.target)
        );
        const nodesDeleted = nodesBefore.filter((n) => toDeleteNodeIds.has(n.id));

        // 2) Применяем удаление в состоянии графа
        setEdges((eds) =>
            eds.filter(
                (e) =>
                    !(
                        toDeleteEdgeIds.has(e.id) ||
                        toDeleteNodeIds.has(e.source) ||
                        toDeleteNodeIds.has(e.target)
                    )
            )
        );
        setNodes((nds) => nds.filter((n) => !toDeleteNodeIds.has(n.id)));

        // 3) ✅ ИЗМЕНЕНИЕ: Сообщаем наружу ВСЕ удалённые элементы (включая неперсистентные)
        // Внешний обработчик (ScenarioMap) сам решит, что с ними делать
        onDeleted?.({
            nodes: nodesDeleted,
            edges: edgesDeleted,
        });

        // 4) Очищаем выделение
        setSelectedNodeIds(new Set());
        setSelectedEdgeIds(new Set());
    }, [selectedNodeIds, selectedEdgeIds, getNodes, getEdges, setEdges, setNodes, onDeleted]);

    // Hotkeys: Del/Backspace (кроме текстовых полей)
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