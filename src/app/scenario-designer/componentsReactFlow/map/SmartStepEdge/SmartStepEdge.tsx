import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
    useStore,
    useReactFlow,
} from '@xyflow/react';
import styles from './SmartStepEdge.module.css';
import type {FlowNode} from "@app/scenario-designer/core/contracts/models/FlowNode.ts";
import {resolveEdgeRender} from "@app/scenario-designer/core/edgeMove/edgeRelations.tsx";

/** Безопасно получаем ноду по id (nodeInternals/nodeLookup + fallback) */
function useNodeById(id?: string) {
    const rf = useReactFlow<FlowNode>();
    const nodeFromStore = useStore((s: any) => {
        if (!id) return undefined;
        const map: Map<string, any> | undefined = (s as any).nodeInternals ?? (s as any).nodeLookup;
        return map?.get(id);
    }) as FlowNode | undefined;
    return nodeFromStore ?? (id ? (rf.getNode(id) as FlowNode | undefined) : undefined);
}

export default function SmartStepEdge(props: EdgeProps) {
    const {
        id,
        source, target,
        sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
        style, selected,
        data
    } = props;

    const [edgePath] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        borderRadius: 8,
    });


    const sourceNode: FlowNode = useNodeById(source)
        ?? (() => {
            throw new Error(`Source node ${source} not found`);
        })();

    const targetNode: FlowNode = useNodeById(target) ?? (() => {
        throw new Error(`Target node ${source} not found`);
    })();

    // hover-флаг, который ты ставишь в edgeMove.data в onEdgeMouseEnter/Leave
    const hovered = Boolean((data as any)?.__hovered);

    // единый цвет для хвоста и головы
    const color = selected ? '#ff3b30' : hovered ? '#2f9aff' : (style?.stroke as string ?? '#ffffff');

    // свой маркер с уникальным id (чтобы цвет не кэшировался браузером)
    const markerId = `smart-edge-arrow-${id}-${selected ? 's' : hovered ? 'h' : 'n'}`;


    // Получаем готовый React-элемент для этой пары (он пока возвращает null — пусто)
    const relationEl = resolveEdgeRender(sourceNode, targetNode, targetPosition);

    return (
        <>
            <defs>
                <marker
                    id={markerId}
                    viewBox="0 0 40 40"
                    markerHeight={20}
                    markerWidth={20}
                    refX={8}
                    refY={5}
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color}  />
                </marker>

            </defs>

            <BaseEdge className={`${styles.baseEdge} ${hovered ? styles.hovered : ''}`}
                      aria-selected={selected}
                      id={id}
                      path={edgePath}
                      markerEnd={`url(#${markerId})`}
                      style={style} />
            {relationEl && (
                <EdgeLabelRenderer>

                    <div
                        className={`${styles.badge} ${selected ? styles.selected : ''}`}
                        style={{ left: `${targetX}px`, top: `${targetY}px` }}
                    >
                        {relationEl}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
