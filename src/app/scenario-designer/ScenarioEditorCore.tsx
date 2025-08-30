import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    addEdge,
    applyNodeChanges,
    Background,
    BackgroundVariant,
    type Connection,
    ConnectionLineType,
    Controls,
    type IsValidConnection,
    MarkerType,
    type OnNodesChange,
    Panel,
    ReactFlow,
    SelectionMode,
    useEdgesState,
    useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './ScenarioEditorPage.module.css';

import {LeftPanel} from '@app/scenario-designer/LeftPanel/LeftPanel';
import {RightPanel} from '@app/scenario-designer/RightPanel/RightPanel';

import {type FlowEdge, type FlowNode} from '@app/scenario-designer/types/FlowNode.ts';

import {nodeTypes as nodeTypesRegistry} from './graph/nodeTypes';
import {useSelection} from './graph/useSelection';
import {useConnectContext} from './graph/useConnectContext';
import {isAnyBranchResizing} from '@app/scenario-designer/graph/branchResizeGuard.ts';

import {edgeTypes} from "@app/scenario-designer/graph/edges/edgeTypes.ts";
import {
    absOf,
    ensureParentBeforeChild,
    pickDeepestBranchByTopLeft,
    rectOf
} from "@app/scenario-designer/graph/dropUtils.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import {createIsValidConnection} from "@app/scenario-designer/graph/edges/connection/isValidConnection.ts";
import {ALLOW_MAP, TARGET_ALLOW_MAP} from "@app/scenario-designer/graph/edges/connection/connectionRules.ts";
import {ConditionStepDto} from "@shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts";
import type {ScenarioDto} from "@shared/contracts/Dtos/ScenarioDtos/Scenarios/ScenarioDto.ts";
import {StepType} from "@shared/contracts/Types/StepType.ts";
import {BranchDto} from "@shared/contracts/Dtos/ScenarioDtos/Branch/BranchDto.ts";

export interface ScenarioEditorProps {

}

const initialScenario  : ScenarioDto =
    {
        id: 'main-scenario',
        branch: BranchDto.create({
            id: "main-branch",
            scenarioId: "main-scenario",
            name: "Main ветка 1",
            conditionOrder: 0,
            x: 0,
            y: 0,
            width: 400,
            height: 200,
            steps: [
                ConditionStepDto.create({
                    id: "condition1",
                    type: StepType.Condition,
                    branchId: "main-branch",
                    name: "condition name",
                    taskQueue: "default",
                    keyInput: "key1",
                    keyOutput: "key2",
                    defaultInput: null,
                    childRelations: [
                    ],
                    parentRelations: [

                    ],
                    branches: [
                        BranchDto.create({
                            id: "Параллельная ветка 1",
                            scenarioId: "main-scenario",
                            name: "Параллельная ветка 1",
                            /** Условие выполнения перехода */
                            conditionExpression: "value > 50",
                            /** Приоритет проверки условия */
                            conditionOrder: 0,
                            conditionStepId: "condition1",
                            x: 170,
                            y: 20,
                            width: 200,
                            height: 100,
                        }),

                        BranchDto.create({
                            id: "Параллельная ветка 2",
                            scenarioId: "main-scenario",
                            name: "Параллельная ветка 1",
                            conditionExpression: "value <= 30",
                            conditionOrder: 1,
                            conditionStepId: "condition1",
                            x: 170,
                            y: 120,
                            width: 200,
                            height: 100,
                        })
                    ],
                    x: 100,
                    y: 100,

                })
            ],
        })


    };

const initialEdges = [
    { id: 'condition1-branch1', source: 'condition1', target: 'branch1', sourceHandle: 's1', targetHandle: 't1' },
    { id: 'condition1-branch2', source: 'condition1', target: 'branch2', sourceHandle: 's3', targetHandle: 't1' }
];


export const ScenarioEditorCore: React.FC<ScenarioEditorProps> = () => {
    // --- состояние графа ---
    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initialEdges);

    // доступ к актуальному стору RF
    const rf = useReactFlow<FlowNode, FlowEdge>();

    // --- helpers для геометрии/поиска ветки ---
    const getAll = useCallback(() => rf.getNodes() as FlowNode[], [rf]);

    // --- выбор/удаление ---
    const { selectedNodeIds, selectedEdgeIds, onSelectionChange, deleteSelected } = useSelection({ setNodes, setEdges });

    // --- drag-соединение: старт/сброс/типонатор/широковещание ---
    const { onConnectStart, onConnectEnd, getNodeType } = useConnectContext({ rf, setNodes });


    // внутри компонента, сразу после state
    useEffect(() => {
        // ждём, пока RF подмонтирует nodes (на следующий тик)
        queueMicrotask(() => {
            const all = rf.getNodes() as FlowNode[];
            const bad = all.filter(n => n.type === FlowType.branchNode)
                .filter(n => {
                    const w = typeof n.width === 'number' ? n.width : typeof (n.style as any)?.width === 'number' ? (n.style as any).width : 0;
                    const h = typeof n.height === 'number' ? n.height : typeof (n.style as any)?.height === 'number' ? (n.style as any).height : 0;
                    return !(w > 0 && h > 0);
                })
                .map(n => n.id);

            if (bad.length) {
                throw new Error(`Invalid scenario: branches without size: ${bad.join(', ')}`);
            }
        });
    }, [rf]);

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

        //Если мы начали перетаскивание с включенным ctrl, значит нужно дать возможность вынести из ветки ноду
        const ctrl = (e as any).ctrlKey === true;

        //Мы сразу делаем node не в ветке
        if (ctrl && node.parentId) {
            ctrlDragIdsRef.current.add(node.id);
            setNodes(nds =>
                nds.map(n => n.id === node.id ?
                    { ...n, extent: undefined, expandParent: false } : n)
            );
        }
    }, [setNodes]);

    // --- Подсветка ветки-цели при перетаскивании существующих нод ---
    const hoverBranchIdRef = useRef<string>(undefined);

    const setHoverBranch = useCallback((branchId: string | undefined) => {
        if (hoverBranchIdRef.current === branchId) return;
        hoverBranchIdRef.current = branchId;
        setNodes((nds): FlowNode[] =>
            nds.map(n =>
                n.type === FlowType.branchNode
                    ? { ...n, data: { ...n.data, isDropTarget: branchId != undefined && n.id === branchId } }
                    : n
            )
        );
    }, [setNodes]);

    const onNodeDrag = useCallback((_e: any, node: FlowNode) => {
        if (isAnyBranchResizing()) return;
        const all = getAll();
        const abs = absOf(node, all);
        const target = pickDeepestBranchByTopLeft(all, abs, node.id);
        setHoverBranch(target?.id);
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
            setHoverBranch(undefined);

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
                    setNodes((nds): FlowNode[] => {
                        let next = nds.map(n =>
                            n.id === current.id
                                ? { ...n, parentId: target.id, position: { x: relX, y: relY }, extent: 'parent' as const, expandParent: true }
                                : n
                        );
                        next = ensureParentBeforeChild(next, target.id, current.id);
                        return next;
                    });
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


                    // ВАЖНО: порядок parent → child
                    next = ensureParentBeforeChild(next, target.id, current.id);

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

                onEdgeMouseEnter={(_, edge) =>
                    setEdges(es => es.map(e => e.id === edge.id
                        ? { ...e, data: { ...e.data, __hovered: true } }
                        : e))}
                onEdgeMouseLeave={(_, edge) =>
                    setEdges(es => es.map(e => e.id === edge.id
                        ? { ...e, data: { ...e.data, __hovered: false } }
                        : e))}

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

                <Controls className={`${styles.flowControls}`} position="top-left" />
                <Background id="1" gap={7} lineWidth={0.1} color="#464646" variant={BackgroundVariant.Lines} />
                <Background id="2" gap={28} lineWidth={0.1} color="#767676" variant={BackgroundVariant.Lines} />

            </ReactFlow>
        </div>
    );
};
