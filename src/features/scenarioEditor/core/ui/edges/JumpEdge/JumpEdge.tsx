import {
    BaseEdge,
    EdgeLabelRenderer,
    type EdgeProps,
    useStore,
    useReactFlow,
} from '@xyflow/react';
import { useMemo } from 'react';
import styles from './JumpEdge.module.css';
import type {FlowNode} from "@scenario/shared/contracts/models/FlowNode.ts";
import { getEdgePath } from '@scenario/core/utils/getEdgePath';
import  { DefaultEdgePathType } from '@scenario/core/types/EdgePathType';

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

export default function JumpEdge(props: EdgeProps) {
    const {
        id,
        source, target,
        sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
        style, selected,
        data
    } = props;

    // Получаем тип пути из JumpStepDto или используем дефолтный (Bezier)
    const edgePathType = (data as any)?.edgePathType ?? DefaultEdgePathType.jump;

    const [edgePath] = getEdgePath(edgePathType, {
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
    });

    const sourceNode: FlowNode | undefined = useNodeById(source);
    const targetNode: FlowNode | undefined = useNodeById(target);

    // hover-флаг
    const hovered = Boolean((data as any)?.__hovered);

    // Особый цвет для jump-связей (красный, как у JumpStepNode)
    const color = selected
        ? 'var(--edge-jump-selected-color)'
        : hovered
            ? 'var(--edge-jump-hovered-color)'
            : 'var(--edge-jump-default-color)';

    // Уникальный маркер для jump-связей
    const markerId = `jump-edge-arrow-${id}-${selected ? 's' : hovered ? 'h' : 'n'}`;

    // Вычисляем центральную точку edge для label
    const edgeCenter = useMemo(() => {
        return {
            x: (sourceX + targetX) / 2,
            y: (sourceY + targetY) / 2,
        };
    }, [sourceX, sourceY, targetX, targetY]);

    return (
        <>
            <defs>
                <marker
                    id={markerId}
                    viewBox="0 0 40 40"
                    markerHeight={20}
                    markerWidth={20}
                    refX={6}
                    refY={5}
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
            </defs>

            <BaseEdge
                className={`${styles.jumpEdge} ${hovered ? styles.hovered : ''}`}
                aria-selected={selected}
                id={id}
                path={edgePath}
                markerEnd={`url(#${markerId})`}
                style={{
                    ...style,
                    stroke: color,
                    strokeWidth: 2,
                    strokeDasharray: '5,5', // Пунктирная линия для отличия от обычных связей
                }}
            />

            <EdgeLabelRenderer>
                {/* Метка "JUMP" по центру */}
                <div
                    className={`${styles.jumpLabel} ${selected ? styles.selected : ''} ${hovered ? styles.hovered : ''}`}
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${edgeCenter.x}px, ${edgeCenter.y}px)`,
                        pointerEvents: 'all',
                    }}
                >
                    ⤴ JUMP
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
