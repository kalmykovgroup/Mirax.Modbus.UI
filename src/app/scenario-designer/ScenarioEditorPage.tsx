import {useState, useCallback, useEffect} from 'react';
import {
    ReactFlow,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    SelectionMode,
    MarkerType,
    Background,
    Controls, BackgroundVariant, Panel, ConnectionLineType,
    type EdgeChange,
    type NodeChange, MiniMap, type OnConnectStartParams, type Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import "./ScenarioEditorPage.css"


import styles from './ScenarioEditorPage.module.css'
import {LeftPanel} from "@app/scenario-designer/LeftPanel/LeftPanel.tsx";
import {RightPanel} from "@app/scenario-designer/RightPanel/RightPanel.tsx";
import {JumpStepNode} from "@app/scenario-designer/components/JumpStepNode/JumpStepNode.tsx";
import {ParallelStepNode} from "@app/scenario-designer/components/ParallelStepNode/ParallelStepNode.tsx";
import {BranchNode} from "@app/scenario-designer/components/BranchNode/BranchNode.tsx";
import {DelayStepNode} from "@app/scenario-designer/components/DelayStepNode/DelayStepNode.tsx";
import {ConditionStepNode} from "@app/scenario-designer/components/ConditionStepNode/ConditionStepNode.tsx";


const initialNodes = [


    {
        id: 'jump1',
        position: {x: 0, y: 0},
        type: 'jumpStepNode',
    },

    {
        id: 'delay1',
        position: {x: 150, y: 100},
        type: 'delayStepNode',
    },
    {
        id: 'parallel1',
        position: {x: 120, y: 60},
        type: 'parallelStepNode',
    },

    {
        id: 'branch1',
        position: {x: 150, y: 110},
        type: 'branchNode',
    },
    {
        id: 'conditionStep1',
        position: {x: 160, y: 170},
        type: 'conditionStepNode',
    },

];

export type ConnectFrom = 'source' | 'target' | null;

const initialEdges: any[] | (() => any[]) = [

];
export default function ScenarioEditorPage() {
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);

    const nodeTypes = {
        jumpStepNode: JumpStepNode,
        parallelStepNode: ParallelStepNode,
        branchNode: BranchNode,
        delayStepNode: DelayStepNode,
        conditionStepNode: ConditionStepNode,
    };


    const onNodesChange = useCallback(
        (changes: NodeChange<{
            id: string;
            position: { x: number; y: number; };
            data: { value: number; label?: undefined; }; type?: undefined; } |
            { id: string; position: { x: number; y: number; };
                data: { label: string; value?: undefined; }; type: string; } |
            { id: string; position: { x: number; y: number; }; data:
                    { label: string; value?: undefined; }; type?: undefined; }>[]) =>
            setNodes(
                (nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange<{ id: string; source: string; target: string; type: string; label: string; }>[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
        [],
    );

    const panOnDrag = [1, 2];

    // 1) флаг направления

    const [connectFrom, setConnectFrom] = useState<ConnectFrom>(null);

// 2) колбэки
    const onConnectStart = useCallback(
        (_evt: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
            // params: { nodeId?, handleId?, handleType?: 'source' | 'target' }
            setConnectFrom(params.handleType ?? null);
            // если нужно знать какой именно коннектор:
            // console.log(params.nodeId, params.handleId, params.handleType);
        },
        []
    );

    const onConnect = useCallback((conn: Connection) => {
        // conn уже содержит source, sourceHandle, target, targetHandle
        setEdges((eds) => addEdge({ ...conn, type: 'step' }, eds));
        setConnectFrom(null); // сбросили режим после успешного соединения
    }, []);

    const onConnectEnd = useCallback(() => {
        // если отпустили «в никуда» — тоже сброс
        setConnectFrom(null);
    }, []);

// 3) прокидываем в ноды (НЕ .map в JSX — обновляем через эффект)
    useEffect(() => {
        setNodes(prev => prev.map(n => ({ ...n, data: { ...n.data, connectFrom } })));
    }, [connectFrom]);


    const defaultEdgeOptions = {
        type: 'step',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
            stroke: '#ffffff',
            strokeWidth: 0.5,
            opacity: 1,
        },
    }

    return (
        <div style={{ width: '100%', height: '600px', background: '#121212' }}>


            <ReactFlow
                onConnectStart={onConnectStart}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}

                /*minZoom={0.001}
                maxZoom={10}*/
                defaultViewport={{ x: 0, y: 0, zoom: 0.3 }}
                className={styles.customFlow}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineType={ConnectionLineType.Step}
                nodeTypes={nodeTypes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                panOnScroll
                selectionOnDrag
                panOnDrag={panOnDrag}
                autoPanSpeed={3}
                selectionMode={SelectionMode.Partial}
                fitView
                nodes={nodes}
            >

                <Panel position="top-left">
                        <LeftPanel/>
                </Panel>


                <Panel position="top-right">
                    <RightPanel/>
                </Panel>

                <Controls className={styles.flowControls} position="top-left"/>

                <Background
                    id="1"
                    gap={7}
                    lineWidth={0.1}     // толщина линий
                    color="#464646"
                    variant={BackgroundVariant.Lines}
                />
                <Background
                    id="2"
                    gap={28}
                    color="#767676"
                    lineWidth={0.1}     // толщина линий
                    variant={BackgroundVariant.Lines}
                />
                <MiniMap />
            </ReactFlow>


        </div>
    );
}