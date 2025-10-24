// src/features/scenarioEditor/core/ui/nodes/BranchNode/BranchNode.tsx
import { useEffect, useRef } from 'react';
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

    // Подписываемся на данные ветки И степов из Redux одновременно
    // КРИТИЧНО: Получаем координаты ветки из ТОГО ЖЕ селектора для консистентности
    // Используем shallowEqual для сравнения примитивных значений
    const branchAndStepsData = useSelector(
        (state: RootState) => {
            if (!branchDto?.scenarioId) return null;
            const scenario = state.scenario.scenarios[branchDto.scenarioId];
            if (!scenario) return null;

            const branch = scenario.branches?.[id];
            if (!branch) return null;

            // Получаем координаты ветки и степов за один раз
            const steps = Object.values(scenario.steps)
                .filter(step => step.branchId === id)
                .map(step => ({
                    id: step.id,
                    x: step.x,
                    y: step.y,
                    width: step.width ?? 100,
                    height: step.height ?? 71
                }));

            return {
                branchX: branch.x,
                branchY: branch.y,
                branchWidth: branch.width ?? 300,
                branchHeight: branch.height ?? 100,
                steps
            };
        },
        // Кастомная функция сравнения: возвращает true если данные идентичны
        (prev, next) => {
            if (prev === next) return true;
            if (!prev || !next) return false;

            // Сравниваем координаты ветки
            if (
                prev.branchX !== next.branchX ||
                prev.branchY !== next.branchY ||
                prev.branchWidth !== next.branchWidth ||
                prev.branchHeight !== next.branchHeight ||
                prev.steps.length !== next.steps.length
            ) {
                return false;
            }

            // Глубокое сравнение массива степов
            for (let i = 0; i < prev.steps.length; i++) {
                const s1 = prev.steps[i];
                const s2 = next.steps[i];

                // Защита от undefined
                if (!s1 || !s2) return false;

                if (
                    s1.id !== s2.id ||
                    s1.x !== s2.x ||
                    s1.y !== s2.y ||
                    s1.width !== s2.width ||
                    s1.height !== s2.height
                ) {
                    return false;
                }
            }

            // Данные идентичны - НЕ обновляем
            return true;
        }
    );

    // Ref для хранения последних примененных размеров (чтобы избежать бесконечного цикла)
    const lastAppliedSizeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

    // Отслеживаем изменения дочерних степов и автоматически расширяем ветку
    useEffect(() => {
        if (!branchAndStepsData || branchAndStepsData.steps.length === 0) return;

        const { branchX, branchY, branchWidth: currentWidth, branchHeight: currentHeight, steps: childSteps } = branchAndStepsData;

        const padding = 12;

        // Находим границы всех степов в АБСОЛЮТНЫХ координатах
        let minAbsX = Infinity;
        let minAbsY = Infinity;
        let maxAbsX = -Infinity;
        let maxAbsY = -Infinity;

        for (const step of childSteps) {
            minAbsX = Math.min(minAbsX, step.x);
            minAbsY = Math.min(minAbsY, step.y);
            maxAbsX = Math.max(maxAbsX, step.x + (step.width ?? 100));
            maxAbsY = Math.max(maxAbsY, step.y + (step.height ?? 71));
        }

        // Ветка должна охватывать все степы с padding со всех сторон
        // Левая граница ветки = самый левый степ - padding
        // Верхняя граница ветки = самый верхний степ - padding
        const newBranchX = minAbsX - padding;
        const newBranchY = minAbsY - padding;

        // Ширина = расстояние от левого до правого края + padding справа
        // Высота = расстояние от верхнего до нижнего края + padding снизу
        const needW = Math.max(300, (maxAbsX - minAbsX) + padding * 2);
        const needH = Math.max(100, (maxAbsY - minAbsY) + padding * 2);

        // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Сравниваем с ПОСЛЕДНИМИ ПРИМЕНЕННЫМИ размерами, а не с текущими из props
        // Это разрывает цикл: autoExpandBranch → Redux → props → useEffect → autoExpandBranch
        const lastApplied = lastAppliedSizeRef.current;
        const needsResize =
            !lastApplied ||  // Первый раз
            Math.round(lastApplied.x) !== Math.round(newBranchX) ||
            Math.round(lastApplied.y) !== Math.round(newBranchY) ||
            Math.round(lastApplied.width) !== Math.round(needW) ||
            Math.round(lastApplied.height) !== Math.round(needH);

        // Если размер или позиция изменились, вызываем autoExpandBranch
        if (needsResize) {
            console.log(`[BranchNode] 📐 Auto-expanding branch ${id}`, {
                from: { x: branchX, y: branchY, width: currentWidth, height: currentHeight },
                to: { x: newBranchX, y: newBranchY, width: needW, height: needH },
                lastApplied,
                childSteps: childSteps.length,
            });

            // Сохраняем новые размеры в ref ДО вызова autoExpandBranch
            lastAppliedSizeRef.current = {
                x: Math.round(newBranchX),
                y: Math.round(newBranchY),
                width: Math.round(needW),
                height: Math.round(needH)
            };

            const branchNode = rf.getNodes().find((n) => n.id === id);
            if (branchNode) {
                // ВСЕГДА передаем новые координаты
                operations.autoExpandBranch(
                    branchNode,
                    Math.round(needW),
                    Math.round(needH),
                    Math.round(newBranchX),
                    Math.round(newBranchY)
                );
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchAndStepsData, id]); // ← rf и operations стабильны, не нужны в зависимостях

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