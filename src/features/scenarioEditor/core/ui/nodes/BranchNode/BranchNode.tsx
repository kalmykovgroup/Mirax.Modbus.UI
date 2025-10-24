// src/features/scenarioEditor/core/ui/nodes/BranchNode/BranchNode.tsx
import { useEffect } from 'react';
import { Handle, type NodeProps, type Node, Position, useReactFlow } from '@xyflow/react';
import { useSelector } from 'react-redux';
import styles from './BranchNode.module.css';
import { formatWithMode } from '@app/lib/utils/format';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { FlowNodeData } from '@/features/scenarioEditor/shared/contracts/models/FlowNodeData';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto';
import { useCtrlKey } from "@app/lib/hooks/useCtrlKey.ts";
import { useShiftKey } from "@app/lib/hooks/useShiftKey.ts";
import { useScenarioOperationsContext } from '@scenario/core/ui/map/ScenarioMap/contexts/ScenarioOperationsContext';
import type { RootState } from '@/baseStore/store';
import type { FlowNode } from '@/features/scenarioEditor/shared/contracts/models/FlowNode';

type Props = NodeProps<Node<FlowNodeData<BranchDto>>>;

export function BranchNode({ data, selected, id }: Props) {
    const isCtrlPressed = useCtrlKey();
    const isShiftPressed = useShiftKey();
    const rf = useReactFlow<FlowNode>();
    const operations = useScenarioOperationsContext();

    const handleType = data.connectContext?.from.handleType;
    const type = data.connectContext?.from.type;
    const isConnectValid =
        type !== FlowType.BranchNode &&
        (type === FlowType.Condition || type === FlowType.Parallel);

    // Получаем DTO ветки из Redux store
    const branchDto = data.object as BranchDto;

    // Подписываемся на изменения степов в этой ветке через Redux
    const childSteps = useSelector((state: RootState) => {
        if (!branchDto?.scenarioId) return [];
        const scenario = state.scenario.scenarios[branchDto.scenarioId];
        if (!scenario) return [];

        // Получаем все степы, которые принадлежат этой ветке
        return Object.values(scenario.steps).filter(step => step.branchId === id);
    });

    // Отслеживаем изменения дочерних степов и автоматически расширяем ветку
    useEffect(() => {
        if (childSteps.length === 0) return;

        const branchX = branchDto.x;
        const branchY = branchDto.y;
        const currentWidth = branchDto.width ?? 300;
        const currentHeight = branchDto.height ?? 100;

        let maxX = 0;
        let maxY = 0;
        const padding = 12;

        console.log(`[BranchNode] 📐 Calculating size for branch ${id}`, {
            childCount: childSteps.length,
            branchPos: { x: branchX, y: branchY },
        });

        for (const step of childSteps) {
            // Координаты и размеры из Redux (актуальные)
            const stepX = step.x;
            const stepY = step.y;
            const stepWidth = step.width ?? 100;
            const stepHeight = step.height ?? 71;

            // Вычисляем относительные координаты от ветки
            const relX = stepX - branchX;
            const relY = stepY - branchY;

            const rightEdge = relX + stepWidth + padding;
            const bottomEdge = relY + stepHeight + padding;

            console.log(`[BranchNode]   Step ${step.id.substring(0, 8)}:`, {
                absPos: { x: stepX, y: stepY },
                relPos: { x: Math.round(relX), y: Math.round(relY) },
                size: { w: stepWidth, h: stepHeight },
                edges: { right: Math.round(rightEdge), bottom: Math.round(bottomEdge) },
            });

            maxX = Math.max(maxX, rightEdge);
            maxY = Math.max(maxY, bottomEdge);
        }

        console.log(`[BranchNode] 📐 Max edges:`, { maxX: Math.round(maxX), maxY: Math.round(maxY) });

        // Вычислить необходимый размер (не меньше минимума)
        const minWidth = 300;
        const minHeight = 100;
        const needWidth = Math.max(minWidth, maxX);
        const needHeight = Math.max(minHeight, maxY);

        // Если размер изменился, вызываем autoExpandBranch
        if (needWidth !== currentWidth || needHeight !== currentHeight) {
            console.log(`[BranchNode] 📐 Auto-expanding branch ${id}`, {
                from: { width: currentWidth, height: currentHeight },
                to: { width: needWidth, height: needHeight },
                childSteps: childSteps.length,
            });

            const branchNode = rf.getNodes().find((n) => n.id === id);
            if (branchNode) {
                operations.autoExpandBranch(branchNode, needWidth, needHeight);
            }
        }
    }, [childSteps, branchDto, id, rf, operations]);

    return (
        <div
            className={styles.branchNodeContainer}
            aria-selected={selected}
            data-ctrl-mode={isCtrlPressed}
            data-shift-mode={isShiftPressed}
            data-draggable={isCtrlPressed}
            data-selectable={isCtrlPressed}
        >
            <div className={styles.bg} />

            <span className={styles.coordinates}>
                <span>x:{formatWithMode(data.x, 2, true)}</span>
                <span>y:{formatWithMode(data.y, 2, true)}</span>
            </span>

            <span className={styles.name}>
                Ветка {isCtrlPressed && '(Ctrl)'} {isShiftPressed && '(Shift)'}
            </span>

            <Handle
                className={styles.target}
                aria-selected={handleType === 'source' && isConnectValid}
                key="t1"
                id="t1"
                type="target"
                position={Position.Left}
            />
        </div>
    );
}