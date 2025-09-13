import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Background,
    BackgroundVariant, type Connection,
    ConnectionLineType,
    Controls, type EdgeChange,
    type IsValidConnection,
    MarkerType,
    type OnNodesChange,
    Panel,
    ReactFlow,
    SelectionMode,
    useEdgesState,
    useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import styles from './ScenarioMap.module.css'

// контракты/типы
import type { FlowEdge, FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode.ts'
import { nodeTypes as nodeTypesRegistry } from '@/features/scenarioEditor/shared/contracts/types/nodeTypes.ts'

// панели
import { RightPanel } from '@scenario/core/ui/map/RightPanel/RightPanel.tsx'
import LeftPanel from '@scenario/core/ui/map/LeftPanel/LeftPanel.tsx'

// граф/утилиты
import {edgeTypes} from "@/features/scenarioEditor/shared/contracts/types/edgeTypes.ts";
import {isAnyBranchResizing} from "@scenario/core/branchResize/branchResizeGuard.ts";
import {createIsValidConnection} from "@scenario/core/edgeMove/isValidConnection.ts";
import {ALLOW_MAP, TARGET_ALLOW_MAP} from "@scenario/core/edgeMove/connectionRules.ts";

// вынесенные сервисы/хуки
import { HoverBranchService } from '@scenario/core/handlers/HoverBranchService.ts'
import { NodeDragStopHandler } from '@scenario/core/handlers/NodeDragStopHandler.ts'
import { ConnectionHandler } from '@scenario/core/handlers/ConnectionHandler.ts'
import { makeOnNodesChange } from '@scenario/core/handlers/NodesChangeHandler.ts'
import { useEdgesRef, useIsValidConnection } from '@scenario/core/hooks/useConnectionValidation.ts'
import { useFitViewOnVersion } from '@scenario/core/hooks/useFitViewOnVersion.ts'
import { useBranchSizeValidation } from '@scenario/core/hooks/useBranchSizeValidation.ts'
import { omitNodeProps } from '@scenario/core/utils/omitNodeProps.ts'

// состояние + загрузка
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store/types.ts'
import { mapScenarioToFlow } from '@scenario/core/mapScenarioToFlow.ts'
import {useSelection} from "@scenario/core/hooks/useSelection.ts";
import {useConnectContext} from "@scenario/core/hooks/useConnectContext.ts";
import {
    absOf,
    ensureParentBeforeChild,
    pickDeepestBranchByTopLeft,
    rectOf
} from "@scenario/core/utils/dropUtils.ts";
import {ScenarioChangeCenter} from "@scenario/core/ScenarioChangeCenter.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {ScenarioOperationDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScenarioOperationDto.ts";
import {DbEntityType} from "@shared/contracts/Types/Api.Shared/Scenario/DbEntityType.ts";
import {DbActionType} from "@shared/contracts/Types/Api.Shared/Scenario/DbActionType.ts";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import {useRightMousePan} from "@scenario/core/hooks/useRightMousePan.ts";
import {refreshScenarioById, ScenarioLoadState, selectActiveScenarioId} from "@/features/scenarioEditor/store/scenarioSlice.ts";


export interface ScenarioEditorProps {}

export const ScenarioMap: React.FC<ScenarioEditorProps> = () => {
    const dispatch = useDispatch<AppDispatch>()

    const makeGuid = () => (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as Guid


    // --- состояние графа ---
    const [nodes, setNodes] = useState<FlowNode[]>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([])

    const edgesRef = useEdgesRef(edges)


    const nodesRef = useRef<FlowNode[]>([])

    useEffect(() => { nodesRef.current = nodes }, [nodes]);


    // активный сценарий
    const activeId = useSelector(selectActiveScenarioId)
    const activeEntry = useSelector((state: RootState) => (activeId ? state.scenario.entities[activeId] ?? null : null))
    const activeScenario = activeEntry?.scenario

    const changeCenter = useMemo(
        () => (activeId ? new ScenarioChangeCenter(activeId) : null), [activeId]
    )

    const onEdgesChangeWithCenter = useCallback((changes: EdgeChange[]) => {
        // штатная логика
        onEdgesChange(changes)

        // фиксация удаления связи
        if (!changeCenter) return
        for (const ch of changes) {
            if (ch.type === 'remove' && ch.id) {
                const edge = edgesRef.current.find(e => e.id === ch.id)
                if (!edge) continue

                const op: ScenarioOperationDto = {
                    opId: makeGuid(),
                    entity: DbEntityType.StepRelation,
                    action: DbActionType.Delete,
                    // если у вас edge.id == id связи — отправляем по id,
                    // иначе можно отправить по паре parent/child:
                    payload: edge.id
                        ? { id: edge.id as Guid }
                        : { parentStepId: edge.source as Guid, childStepId: edge.target as Guid }
                }
                changeCenter.handle(op)
            }
        }
    }, [onEdgesChange, edgesRef, changeCenter])


    // версия для пересборки
    const scenarioVersion =
        activeEntry ? `${activeEntry.scenario.id}:${activeEntry.lastFetchedAt ?? 0}:${activeEntry.loadState}` : 'none'

    // догрузка деталей при необходимости
    useEffect(() => {
        if (!activeId) return
        if (activeEntry?.loadState !== ScenarioLoadState.Full) {
            dispatch(refreshScenarioById(activeId, false)).catch(() => {})
        }
    }, [dispatch, activeId, activeEntry?.loadState])

    // пересборка графа при изменении версии
    useEffect(() => {
        if (!activeScenario) {
            setNodes([])
            setEdges([])
            return
        }
        const { nodes: n, edges: e } = mapScenarioToFlow(activeScenario)
        setNodes(n)
        setEdges(e)
    }, [scenarioVersion, activeScenario, setEdges])

    // доступ к RF
    const rf = useReactFlow<FlowNode, FlowEdge>()

    // подгон вида и валидация размеров веток
    useFitViewOnVersion(rf as any, scenarioVersion)
    useBranchSizeValidation(rf as any)

    // helpers
    const getAll = useCallback(() => rf.getNodes() as FlowNode[], [rf])

    // выбор/удаление
    const { selectedNodeIds, selectedEdgeIds, onSelectionChange, deleteSelected } = useSelection({
        setNodes,
        setEdges,
        getNodes: () => nodesRef.current,
        getEdges: () => edgesRef.current,
        onDeleted: ({ nodes, edges }) => {
            if (!changeCenter) return

            // НОДЫ: Step или Branch → DELETE
            for (const n of nodes) {
                const isBranch = n.type === 'branchNode' || n.type === FlowType.branchNode
                changeCenter.handle({
                    opId: makeGuid(),
                    entity: isBranch ? DbEntityType.Branch : DbEntityType.Step,
                    action: DbActionType.Delete,
                    payload: { id: n.id as Guid },
                })
            }

            // РЁБРА: StepRelation → DELETE (по id, либо по паре parent/child)
            for (const e of edges) {
                changeCenter.handle({
                    opId: makeGuid(),
                    entity: DbEntityType.StepRelation,
                    action: DbActionType.Delete,
                    payload: e.id
                        ? { id: e.id as Guid }
                        : { parentStepId: e.source as Guid, childStepId: e.target as Guid },
                })
            }
        },
    })


    // drag-соединение
    const { onConnectStart, onConnectEnd, getNodeType } = useConnectContext({ rf, setNodes })

    // --- hover ветки-цели (вынесено) ---
    const hover = useMemo(
        () => new HoverBranchService(getAll, setNodes, { absOf, pickDeepestBranchByTopLeft, isAnyBranchResizing }),
        [getAll, setNodes]
    )
    const setHoverBranch = useCallback(hover.setHoverBranch, [hover])
    const onNodeDrag = useCallback(hover.onNodeDrag, [hover])

    // --- Ctrl-drag ids ---
    const ctrlDragIdsRef = useRef<Set<string>>(new Set())

    // старт перетаскивания (без изменений логики)
    const onNodeDragStart = useCallback(
        (e: React.MouseEvent | React.TouchEvent, node: FlowNode) => {
            const ctrl = (e as any).ctrlKey === true
            if (ctrl && node.parentId) {
                ctrlDragIdsRef.current.add(node.id)
                setNodes((nds) =>
                    nds.map((n): FlowNode => {
                        if (n.id !== node.id) return n
                        const base = omitNodeProps(n, ['extent'])
                        return { ...base, expandParent: false } as FlowNode
                    })
                )
            }
        },
        [setNodes]
    )




    // --- финализация перетаскивания (вынесено) ---
    const dropHandler = useMemo(
        () =>
            new NodeDragStopHandler({
                getAll,
                setNodes,
                setHoverBranch,
                ctrlDragIdsRef,
                utils: { absOf, rectOf, ensureParentBeforeChild, pickDeepestBranchByTopLeft, isAnyBranchResizing },
                // ScenarioMap.tsx — в useMemo(...) где создаёшь NodeDragStopHandler
                callbacks: {
                    onStepAttachedToBranch: (stepId, branchId, x, y) => {
                        if (!changeCenter) return;

                        // проверяем, известен ли шаг БД
                        const n = rf.getNodes().find(nn => nn.id === stepId);
                        const isPersisted = !!(n && (n.data as any)?.__persisted);

                        if (isPersisted) {
                            // уже существует в БД → просто обновляем branchId и координаты
                            changeCenter.update({
                                opId: makeGuid(),
                                entity: DbEntityType.Step,
                                action: DbActionType.Update,
                                payload: { id: stepId as Guid, branchId: branchId as Guid, x, y },
                            });
                        } else {
                            // впервые попал в ветку → создаём шаг в БД
                            changeCenter.create({
                                opId: makeGuid(),
                                entity: DbEntityType.Step,
                                action: DbActionType.Create,
                                payload: { id: stepId as Guid, branchId: branchId as Guid, x, y },
                            });

                            // локально помечаем как персистентный, чтобы дальше шли Update
                            rf.setNodes(nds =>
                                nds.map(nn => nn.id === stepId ? { ...nn, data: { ...nn.data, __persisted: true } } : nn)
                            );
                        }
                    },

                    onStepMoved: (stepId, x, y) => {
                        if (!changeCenter) return;
                        // Перемещение по плоскости — шлём Update только для персистентных
                        const n = rf.getNodes().find(nn => nn.id === stepId);
                        if ((n?.data as any)?.__persisted) {
                            changeCenter.update({
                                opId: makeGuid(),
                                entity: DbEntityType.Step,
                                action: DbActionType.Update,
                                payload: { id: stepId as Guid, x, y },
                            });
                        }
                    },

                    onStepDetachedFromBranch: (stepId) => {
                        if (!changeCenter) return;

                        // Если шаг НЕ персистентный — просто удаляем его из UI (опционально) и ничего не шлём
                        const n = rf.getNodes().find(nn => nn.id === stepId);
                        const isPersisted = !!(n && (n.data as any)?.__persisted);
                        if (!isPersisted) return;

                        // Персистентный шаг вынесли на поле:
                        // 1) удалить все StepRelation, где он участник
                        changeCenter.delete({
                            opId: makeGuid(),
                            entity: DbEntityType.StepRelation,
                            action: DbActionType.Delete,
                            payload: { stepId: stepId as Guid }, // сервер удалит все связи с этим шагом
                        });

                        // 2) удалить сам шаг
                        changeCenter.delete({
                            opId: makeGuid(),
                            entity: DbEntityType.Step,
                            action: DbActionType.Delete,
                            payload: { id: stepId as Guid },
                        });

                        // локально можно пометить как неперсистентный либо убрать ноду
                        rf.setNodes(nds =>
                            nds.map(nn => nn.id === stepId ? { ...nn, data: { ...nn.data, __persisted: false } } : nn)
                        );
                    },

                    onBranchResized: (branchId, width, height) => {
                        if (!changeCenter) return;
                        changeCenter.update({
                            opId: makeGuid(),
                            entity: DbEntityType.Branch,
                            action: DbActionType.Update,
                            payload: { id: branchId as Guid, width, height },
                        });
                    },
                }

            }),
        [getAll, setNodes, setHoverBranch, changeCenter]
    )



    const onNodeDragStop = useCallback(dropHandler.onNodeDragStop, [dropHandler])

    // --- соединения (вынесено) ---
    const connectionHandler = useMemo(() => new ConnectionHandler(setEdges, onConnectEnd), [setEdges, onConnectEnd])


    const onConnect = useCallback((conn: Connection) => {
        // сначала работаем как раньше
        connectionHandler.onConnect(conn)

        // затем сообщаем в центр изменений
        if (!changeCenter || !conn.source || !conn.target) return
        const op: ScenarioOperationDto = {
            opId: makeGuid(),
            entity: DbEntityType.StepRelation,
            action: DbActionType.Create,
            payload: { parentStepId: conn.source as Guid, childStepId: conn.target as Guid }
        }
        changeCenter.handle(op)
    }, [connectionHandler, changeCenter])



    // --- валидатор соединений (вынесено) ---
    const isValidConnection: IsValidConnection<FlowEdge> = useIsValidConnection(
        getNodeType,
        () => edgesRef.current,
        createIsValidConnection,
        ALLOW_MAP,
        TARGET_ALLOW_MAP
    )

    // --- изменения нод (вынесено) ---
    const onNodesChange: OnNodesChange<FlowNode> = useMemo(
        () => makeOnNodesChange(setNodes, isAnyBranchResizing),
        [setNodes]
    )

    // реестр типов
    const nodeTypes = useMemo(() => nodeTypesRegistry, [])


    const { containerRef, onMouseDown: onRmbDown } = useRightMousePan(rf as any)

    return (
        <div
            ref={containerRef}
            onMouseDown={onRmbDown}
            style={{ width: '100%', height: '600px', background: '#121212' }}>
            <ReactFlow<FlowNode, FlowEdge>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                // hover рёбер
                onEdgeMouseEnter={(_, edge) =>
                    setEdges((es) => es.map((e) => (e.id === edge.id ? { ...e, data: { ...e.data, __hovered: true } } : e)))
                }
                onEdgeMouseLeave={(_, edge) =>
                    setEdges((es) => es.map((e) => (e.id === edge.id ? { ...e, data: { ...e.data, __hovered: false } } : e)))
                }
                // выбор/мультивыбор
                onSelectionChange={onSelectionChange}
                // изменения графа
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChangeWithCenter}
                onNodeDrag={onNodeDrag}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                // соединения
                onConnectStart={onConnectStart}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                isValidConnection={isValidConnection}
                // камера/сетап/UX
                minZoom={0.01}
                maxZoom={10}
                defaultEdgeOptions={{
                    animated: true,
                    type: 'step' as const,
                    markerEnd: { type: MarkerType.ArrowClosed },
                    style: { stroke: '#ffffff', strokeWidth: 1, opacity: 1 },
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
    )
}
