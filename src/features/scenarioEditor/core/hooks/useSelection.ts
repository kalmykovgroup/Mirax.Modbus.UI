import React, { useCallback, useEffect, useState } from 'react'
import type { Edge } from '@xyflow/react'
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode.ts'

type Props = {
    setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>
    setEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>

    // новые зависимости — чтобы понять, что именно удаляем:
    getNodes: () => FlowNode[]
    getEdges: () => FlowEdge[]

    // опциональный колбэк: сообщаем наружу, какие ноды/рёбра реально удалены
    onDeleted?: (payload: { nodes: FlowNode[]; edges: FlowEdge[] }) => void
}

export function useSelection({ setNodes, setEdges, getNodes, getEdges, onDeleted }: Props) {
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set())
    const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set())

    const onSelectionChange = useCallback(
        ({ nodes: selNodes, edges: selEdges }: { nodes: FlowNode[]; edges: Edge[] }) => {
            setSelectedNodeIds(new Set(selNodes.map((n) => n.id)))
            setSelectedEdgeIds(new Set(selEdges.map((e) => e.id)))
        },
        []
    )

    const deleteSelected = useCallback(() => {
        if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return

        // 1) узнаём, что именно будет удалено
        const nodesBefore = getNodes()
        const edgesBefore = getEdges()

        const toDeleteNodeIds = new Set(selectedNodeIds)
        const toDeleteEdgeIds = new Set(selectedEdgeIds)

        // Рёбра удаляются, если:
        //  - выбрано само ребро, ИЛИ
        //  - удаляется хотя бы одна из его нод (source/target)
        const edgesDeleted = edgesBefore.filter(
            (e) => toDeleteEdgeIds.has(e.id) || toDeleteNodeIds.has(e.source) || toDeleteNodeIds.has(e.target)
        )
        const nodesDeleted = nodesBefore.filter((n) => toDeleteNodeIds.has(n.id))

        // 2) применяем удаление в состоянии графа
        setEdges((eds) =>
            eds.filter((e) => !(toDeleteEdgeIds.has(e.id) || toDeleteNodeIds.has(e.source) || toDeleteNodeIds.has(e.target)))
        )
        setNodes((nds) => nds.filter((n) => !toDeleteNodeIds.has(n.id)))

        // 3) сообщаем наружу, что именно удалили (для ScenarioChangeCenter)
        onDeleted?.({ nodes: nodesDeleted, edges: edgesDeleted })

        // 4) очищаем выделение
        setSelectedNodeIds(new Set())
        setSelectedEdgeIds(new Set())
    }, [selectedNodeIds, selectedEdgeIds, getNodes, getEdges, setEdges, setNodes, onDeleted])

    // hotkeys: Del/Backspace (кроме текстовых полей)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null
            const typing =
                !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as any).isContentEditable)
            if (typing) return

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault()
                deleteSelected()
            }
        }

        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [deleteSelected])

    return {
        selectedNodeIds,
        selectedEdgeIds,
        onSelectionChange,
        deleteSelected,
    }
}
