import {
    BaseEdge,
    EdgeLabelRenderer,
    type EdgeProps,
    useStore,
    useReactFlow,
} from '@xyflow/react';
import { useMemo } from 'react';
import styles from './SmartStepEdge.module.css';
import type {FlowNode} from "@scenario/shared/contracts/models/FlowNode.ts";
import {resolveEdgeRender} from "@scenario/core/edgeMove/edgeRelations.tsx";
import { EditButton } from '@scenario/core/ui/ScenarioMap/components/EditButton';
import { useNodeEditModal } from '@scenario/core/ui/nodes/components/NodeEditModal/NodeEditModalProvider.tsx';
import { StepRelationEditContract } from '@scenario/core/ui/edges/StepRelation/StepRelationEditContract.tsx';
import { ConditionStepBranchRelationEditContract } from '@scenario/core/ui/edges/ConditionStepBranchRelation/ConditionStepBranchRelationEditContract.tsx';
import { ParallelStepBranchRelationEditContract } from '@scenario/core/ui/edges/ParallelStepBranchRelation/ParallelStepBranchRelationEditContract.tsx';
import { getEdgePath } from '@scenario/core/utils/getEdgePath';
import { DefaultEdgePathType } from '@scenario/core/types/EdgePathType';

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

    const { openEdgeEditModal } = useNodeEditModal();

    // Получаем тип пути из данных edge или используем дефолтный
    const edgePathType = (data as any)?.relationDto?.edgePathType ?? DefaultEdgePathType.step;

    const [edgePath] = getEdgePath(edgePathType, {
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

    // hover-флаг, который ты ставишь в edgeMove.shared в onEdgeMouseEnter/Leave
    const hovered = Boolean((data as any)?.__hovered);

    // DEBUG: Логируем состояние hovered (только при изменении)
    // useMemo(() => {
    //     if (hovered) {
    //         console.log('[SmartStepEdge] Edge hovered:', id, { data });
    //     }
    // }, [hovered, id]);

    // единый цвет для хвоста и головы
    const color = selected
        ? 'var(--edge-selected-color, #ff3b30)'
        : hovered
            ? 'var(--edge-hovered-color, #2f9aff)'
            : (style?.stroke as string ?? 'var(--edge-default-color, #ffffff)');

    // свой маркер с уникальным id (чтобы цвет не кэшировался браузером)
    const markerId = `smart-edge-arrow-${id}-${selected ? 's' : hovered ? 'h' : 'n'}`;


    // Получаем готовый React-элемент для этой пары (он пока возвращает null — пусто)
    const relationEl = resolveEdgeRender(sourceNode, targetNode, targetPosition);

    // Вычисляем центральную точку edge для кнопки редактирования
    const edgeCenter = useMemo(() => {
        return {
            x: (sourceX + targetX) / 2,
            y: (sourceY + targetY) / 2,
        };
    }, [sourceX, sourceY, targetX, targetY]);

    // Обработчик клика по кнопке редактирования
    const handleEditClick = () => {
        // Получаем DTO из data
        const dto = (data as any)?.relationDto;

        if (!dto) {
            console.warn('[SmartStepEdge] No relationDto found in edge data', data);
            return;
        }

        // Определяем тип связи по наличию специфичных полей
        let contract;

        if ('parentStepId' in dto && 'childStepId' in dto) {
            // StepRelationDto - связь между шагами
            contract = StepRelationEditContract;
        } else if ('conditionStepId' in dto && 'branchId' in dto) {
            // ConditionStepBranchRelationDto - условный переход на ветку
            contract = ConditionStepBranchRelationEditContract;
        } else if ('parallelStepId' in dto && 'branchId' in dto) {
            // ParallelStepBranchRelationDto - параллельная ветка
            contract = ParallelStepBranchRelationEditContract;
        } else {
            console.warn('[SmartStepEdge] Unknown edge type, cannot determine contract', dto);
            return;
        }

        // Открываем модальное окно с выбранным контрактом
        openEdgeEditModal(props, contract);
    };

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
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color}  />
                </marker>

            </defs>

            <BaseEdge className={`${styles.baseEdge} ${hovered ? styles.hovered : ''}`}
                      aria-selected={selected}
                      id={id}
                      path={edgePath}
                      markerEnd={`url(#${markerId})`}
                      style={style} />
            <EdgeLabelRenderer>
                {/* Badge с relationEl если есть */}
                {relationEl && (
                    <div
                        className={`${styles.badge} ${selected ? styles.selected : ''}`}
                        style={{ left: `${targetX}px`, top: `${targetY}px` }}
                    >
                        {relationEl}
                    </div>
                )}

                {/* Кнопка редактирования по центру edge */}
                <EditButton
                    visible={hovered}
                    position="fixed"
                    x={edgeCenter.x}
                    y={edgeCenter.y}
                    onClick={handleEditClick}
                    title="Редактировать связь"
                />
            </EdgeLabelRenderer>
        </>
    );
}
