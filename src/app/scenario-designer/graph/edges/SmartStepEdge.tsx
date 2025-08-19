import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
    useStore,
    useReactFlow,
} from '@xyflow/react';
import type { FlowNode } from '@app/scenario-designer/types/FlowNode.ts';
import { resolveEdgeRender } from '@app/scenario-designer/graph/edges/edgeRelations';
import styles from './SmartStepEdge.module.css';

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
        markerEnd, style, selected,
    } = props;

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        borderRadius: 8,
    });

    const sourceNode = useNodeById(source);
    const targetNode = useNodeById(target);

    // Получаем готовый React-элемент для этой пары (он пока возвращает null — пусто)
    const relationEl = resolveEdgeRender(sourceNode, targetNode);

    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
            {relationEl && (
                <EdgeLabelRenderer>
                    <div
                        className={`${styles.badge} ${selected ? styles.selected : ''}`}
                        style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
                    >
                        {relationEl}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
