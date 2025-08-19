import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    Panel,
    MarkerType,
    BackgroundVariant,
    SelectionMode,
    ConnectionLineType,
    addEdge,
    applyNodeChanges,
    useEdgesState,
    useReactFlow,
    type Connection,
    type OnNodesChange,
    type IsValidConnection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './ScenarioEditorPage.module.css';

import { LeftPanel } from '@app/scenario-designer/LeftPanel/LeftPanel';
import { RightPanel } from '@app/scenario-designer/RightPanel/RightPanel';

import { type FlowEdge, type FlowNode } from '@app/scenario-designer/types/FlowNode.ts';

import { nodeTypes as nodeTypesRegistry } from './graph/nodeTypes';
import { ALLOW_MAP, TARGET_ALLOW_MAP } from './graph/connectionRules';
import { createIsValidConnection } from './graph/isValidConnection';
import { useSelection } from './graph/useSelection';
import { useConnectContext } from './graph/useConnectContext';
import { isAnyBranchResizing } from '@app/scenario-designer/graph/branchResizeGuard.ts';

import {edgeTypes} from "@app/scenario-designer/graph/edges/edgeTypes.ts";
import {absOf, pickDeepestBranchByTopLeft, rectOf} from "@app/scenario-designer/graph/dropUtils.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";

export interface ScenarioEditorProps {

}

export const ScenarioEditorCore: React.FC<ScenarioEditorProps> = () => {
    // --- состояние графа ---
    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

    // доступ к актуальному стору RF
    const rf = useReactFlow<FlowNode, FlowEdge>();

    // --- helpers для геометрии/поиска ветки ---
    const getAll = useCallback(() => rf.getNodes() as FlowNode[], [rf]);

    // --- выбор/удаление ---
    const { selectedNodeIds, selectedEdgeIds, onSelectionChange, deleteSelected } = useSelection({ setNodes, setEdges });

    // --- drag-соединение: старт/сброс/типонатор/широковещание ---
    const { onConnectStart, onConnectEnd, getNodeType } = useConnectContext({ rf, setNodes });

    // успешное соединение — добавляем ребро и сбрасываем контекст
    const onConnect = useCallback((conn: Connection) => {
        setEdges((eds) => addEdge({ ...conn, type: 'step' }, eds));
        onConnectEnd();
    }, [setEdges, onConnectEnd]);

    // валидатор соединений
    const edgesRef = useRef<FlowEdge[]>([]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);

    const isValidConnection: IsValidConnection<FlowEdge> = useMemo(
        () => createIsValidConnection({
            getNodeType,
            getEdges: () => edgesRef.current,   // ← вместо MutableRefObject
            allowMap: ALLOW_MAP,
            targetAllowMap: TARGET_ALLOW_MAP,
        }),
        [getNodeType]                          // геттер всегда вернёт актуальные edges
    );

    // синхронизация координат в node.data (если показываешь x/y на ноде)
    const onNodesChange: OnNodesChange<FlowNode> = useCallback((changes) => {
        setNodes((nds) => {
            let next = applyNodeChanges<FlowNode>(changes, nds);

            // если идёт ресайз ветки — вообще ничего умного не делаем
            if (isAnyBranchResizing()) {
                return next.map(n => ({ ...n, data: { ...n.data, x: n.position.x, y: n.position.y } }));
            }
            // просто поддерживаем отображение x/y
            return next.map(n => ({ ...n, data: { ...n.data, x: n.position.x, y: n.position.y } }));
        });
    }, []);

    // --- Ctrl-drag из ветки наружу: пометка на старте ---
    const ctrlDragIdsRef = useRef<Set<string>>(new Set());

    const onNodeDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, node: FlowNode) => {
        // @@ts-expect-error ctrlKey есть у Mouse/Pointer событий
        const ctrl = (e as any).ctrlKey === true;
        if (ctrl && node.parentId) {
            ctrlDragIdsRef.current.add(node.id);
            setNodes(nds =>
                nds.map(n => n.id === node.id ? { ...n, extent: undefined, expandParent: false } : n)
            );
        }
    }, [setNodes]);

    // --- Подсветка ветки-цели при перетаскивании существующих нод ---
    const hoverBranchIdRef = useRef<string | null>(null);
    const setHoverBranch = useCallback((branchId: string | null) => {
        if (hoverBranchIdRef.current === branchId) return;
        hoverBranchIdRef.current = branchId;
        setNodes((nds): FlowNode[] =>
            nds.map(n =>
                n.type === FlowType.branchNode
                    ? { ...n, data: { ...n.data, isDropTarget: branchId != null && n.id === branchId } }
                    : n
            )
        );
    }, [setNodes]);

    const onNodeDrag = useCallback((_e: any, node: FlowNode) => {
        if (isAnyBranchResizing()) return;
        const all = getAll();
        const abs = absOf(node, all);
        const target = pickDeepestBranchByTopLeft(all, abs, node.id);
        setHoverBranch(target?.id ?? null);
    }, [getAll, absOf, pickDeepestBranchByTopLeft, setHoverBranch]);

    // --- Финализация дропа существующей ноды ---
    const onNodeDragStop = useCallback(
        (_e: React.MouseEvent | React.TouchEvent, node: FlowNode) => {
            if (isAnyBranchResizing()) return;

            const all = getAll();
            const current = all.find(n => n.id === node.id) ?? node;
            const absTL = absOf(current, all);                            // левый-верх узла (абсолютный)
            const target = pickDeepestBranchByTopLeft(all, absTL, current.id);

            // снять подсветку
            setHoverBranch(null);

            const wasCtrl = ctrlDragIdsRef.current.has(current.id);
            if (wasCtrl) ctrlDragIdsRef.current.delete(current.id);

            // Ctrl-drag: разрешаем вынести наружу / перепривязать без роста ветки
            if (wasCtrl) {
                if (!target) {
                    // вынесли на поле
                    setNodes((nds): FlowNode[] =>
                        nds.map(n =>
                            n.id === current.id
                                ? { ...n, parentId: undefined, position: { x: absTL.x, y: absTL.y }, extent: undefined, expandParent: undefined }
                                : n
                        )
                    );
                } else if (current.type !== FlowType.branchNode) {
                    // перепривязали к ветке (без авто-роста)
                    const br = rectOf(target, all);
                    const relX = absTL.x - br.x, relY = absTL.y - br.y;
                    setNodes((nds): FlowNode[] =>
                        nds.map(n =>
                            n.id === current.id
                                ? { ...n, parentId: target.id, position: { x: relX, y: relY }, extent: 'parent' as const, expandParent: true }
                                : n
                        )
                    );
                }
                return;
            }

            // Обычный drag
            if (target && current.type !== FlowType.branchNode) {
                const br = rectOf(target, all);

                if (current.parentId === target.id) {
                    // перемещение ВНУТРИ той же ветки: позицию НЕ трогаем, только подрастим при необходимости
                    const relX = current.position.x, relY = current.position.y;
                    const childW = current.width ?? 0, childH = current.height ?? 0;
                    if (childW > 0 && childH > 0) {
                        const pad = 12;
                        const needW = Math.max(br.w, relX + childW + pad);
                        const needH = Math.max(br.h, relY + childH + pad);
                        if (needW !== br.w || needH !== br.h) {
                            setNodes((nds): FlowNode[] =>
                                nds.map(n =>
                                    n.id === target.id
                                        ? { ...n, style: { ...(n.style ?? {}), width: needW, height: needH } }
                                        : n
                                )
                            );
                        }
                    }
                    return;
                }

                // перенос В ДРУГУЮ ветку или с поля → репарентим и растим при необходимости
                const relX = absTL.x - br.x, relY = absTL.y - br.y;
                const childW = current.width ?? 0, childH = current.height ?? 0;

                setNodes((nds): FlowNode[] => {
                    // 1) делаем дочерним новой ветки
                    let next = nds.map(n =>
                        n.id === current.id
                            ? { ...n, parentId: target.id, position: { x: relX, y: relY }, extent: 'parent' as const, expandParent: true }
                            : n
                    );
                    // 2) если размеры известны — гарантируем вместимость ветки
                    if (childW > 0 && childH > 0) {
                        const pad = 12;
                        const needW = Math.max(br.w, relX + childW + pad);
                        const needH = Math.max(br.h, relY + childH + pad);
                        next = next.map(n =>
                            n.id === target.id
                                ? { ...n, style: { ...(n.style ?? {}), width: needW, height: needH } }
                                : n
                        );
                    }
                    return next;
                });

                return;
            }

            // нет целевой ветки: ничего не делаем; extent:'parent' удержит внутри, выход без Ctrl невозможен
        },
        [getAll, absOf, pickDeepestBranchByTopLeft, rectOf, setHoverBranch, setNodes]
    );

    // реестр компонентов нод (мемо, чтобы не пересоздавался)
    const nodeTypes = useMemo(() => nodeTypesRegistry, []);

    return (
        <div style={{ width: '100%', height: '600px', background: '#121212' }}>
            <ReactFlow<FlowNode, FlowEdge>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}

                // выбор/мультивыбор
                onSelectionChange={onSelectionChange}

                // изменения графа
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDrag={onNodeDrag}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}

                // drag-соединения
                onConnectStart={onConnectStart}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                isValidConnection={isValidConnection}

                // камера/сетап/UX
                minZoom={0.01}
                maxZoom={10}

                // дефолтные параметры рёбер
                defaultEdgeOptions={{
                    animated: true,
                    type: 'step' as const,
                    markerEnd: { type: MarkerType.ArrowClosed },
                    style: { stroke: '#ffffff', strokeWidth: 1, opacity: 1 },
                }}
                connectionLineType={ConnectionLineType.Step}
                selectionOnDrag
                selectionMode={SelectionMode.Partial}
                panOnDrag={[1, 2]}      // ЛКМ — выбор/перенос, панорамирование — средней/ПКМ
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

                <Controls className={styles.flowControls} position="top-left" />
                <Background id="1" gap={7} lineWidth={0.1} color="#464646" variant={BackgroundVariant.Lines} />
                <Background id="2" gap={28} lineWidth={0.1} color="#767676" variant={BackgroundVariant.Lines} />

            </ReactFlow>
        </div>
    );
};
