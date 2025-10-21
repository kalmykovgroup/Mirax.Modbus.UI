// src/features/scenarioEditor/core/ui/map/RightPanel/RightPanel.tsx

import styles from "./RightPanel.module.css";
import React, { useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import {
    commitDropToBranch,
    getAll,
    pickDeepestBranchByTopLeft,
    setHoverBranch
} from "@scenario/core/utils/dropUtils";
import {
    ConditionStepDto,
    DelayStepDto,
    JumpStepDto,
    ActivityModbusStepDto,
    ParallelStepDto,
    SignalStepDto,
    ActivitySystemStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto";
import { BranchDto } from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto";
import { FlowType } from "@scenario/core/ui/nodes/types/flowType.ts";
import type { FlowNode } from "@/features/scenarioEditor/shared/contracts/models/FlowNode";
import type { FlowNodeData } from "@scenario/shared/contracts/models/FlowNodeData.ts";

// ⚡ NEW: Командная система (заменяет ScenarioChangeCenter)
import { useSelector } from "react-redux";
import { selectActiveScenarioId } from "@scenario/store/scenarioSelectors";
import type { Guid } from "@app/lib/types/Guid";
import {useCommandDispatcher} from "@scenario/core/features/scenarioChangeCenter/useCommandDispatcher.ts";
import {BranchCommands, StepCommands} from "@scenario/core/features/scenarioChangeCenter/commandBuilders.ts";

function createByFlowType(type: FlowType, p: any) {
    switch (type) {
        case FlowType.ActivityModbus:  return ActivityModbusStepDto.create(p);
        case FlowType.ActivitySystem:  return ActivitySystemStepDto.create(p);
        case FlowType.Delay:       return DelayStepDto.create(p);
        case FlowType.Signal:      return SignalStepDto.create(p);
        case FlowType.Jump:        return JumpStepDto.create(p);
        case FlowType.Parallel:    return ParallelStepDto.create(p);
        case FlowType.Condition:   return ConditionStepDto.create(p);
        case FlowType.BranchNode:          return BranchDto.create(p);
        default:
            throw new Error(`FlowType ${type} не является шагом (или не поддержан)`);
    }
}

// Какие flow-типами считаем «шагами» для Create Step
const STEP_FLOW_TYPES: Set<FlowType> = new Set<FlowType>([
    FlowType.ActivityModbus,
    FlowType.ActivitySystem,
    FlowType.Delay,
    FlowType.Signal,
    FlowType.Jump,
    FlowType.Parallel,
    FlowType.Condition,
]);

export const RightPanel: React.FC = () => {
    const rf = useReactFlow<FlowNode>();
    const activeId = useSelector(selectActiveScenarioId);

    // ⚡ NEW: Command dispatcher вместо change center
    const commandDispatcher = useCommandDispatcher(activeId);

    const hoverBranchIdRef = useRef<string | null>(null);

    const setHover = (id: string | null) => {
        if (hoverBranchIdRef.current === id) return;
        hoverBranchIdRef.current = id;
        setHoverBranch(rf.setNodes as any, id);
    };

    const startCreateNode = (type: FlowType) => (e: React.MouseEvent) => {
        e.preventDefault();
        const id = crypto.randomUUID();

        const move = (ev: MouseEvent) => {
            const pos = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });

            // Подсветка цели
            const all = getAll(rf);
            const target = pickDeepestBranchByTopLeft(all, pos, id);
            setHover(target?.id ?? null);

            rf.setNodes((nds): FlowNode[] => {
                const exists = nds.find((n) => n.id === id);
                if (exists) {
                    return nds.map((n) =>
                        n.id === id
                            ? {
                                ...n,
                                position: pos,
                                data: {
                                    ...n.data
                                } as FlowNodeData<object>,
                            }
                            : n
                    );
                }

                // Создаём DTO для shared.object
                const object = createByFlowType(type, { id });

                const newNode: FlowNode = {
                    id,
                    type,
                    position: pos,
                    data: {
                        object,
                        x: 0,
                        y: 0,
                        __persisted: false,
                    } as FlowNodeData<object>,
                    draggable: true,
                    selectable: true,
                    ...(type === FlowType.BranchNode
                        ? { style: { width: 300, height: 100 } }
                        : {}),
                };

                return nds.concat(newNode);
            });
        };

        const up = (ev: MouseEvent) => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);

            const drop = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
            const all = getAll(rf);
            const target = pickDeepestBranchByTopLeft(all, drop, id);

            // Снять подсветку
            setHover(null);

            if (!target) {
                // Без ветки: визуально — как было; операции не шлём
                return;
            }

            // Единый коммит в граф
            commitDropToBranch(rf.setNodes as any, all, target, id, drop, /*growBranch*/ true);

            // Помечаем как персистентный локально
            rf.setNodes((nds) =>
                nds.map(n => n.id === id ? { ...n, data: { ...n.data, __persisted: true } } : n)
            );

            // ⚡ NEW: Шлём операцию через командный диспетчер
            if (!commandDispatcher || !activeId) return;

            // Если это ветка → создаём Branch
            if (type === FlowType.BranchNode) {
                const width = 300;
                const height = 100;

                const branch = BranchDto.create({
                    id: id as Guid,
                    scenarioId: activeId,
                    x: drop.x,
                    y: drop.y,
                    width,
                    height,
                    name: 'Новая ветка',
                    stepIds: [],
                });

                commandDispatcher.execute(
                    BranchCommands.create(
                        activeId,
                        { branch, parentStepId: null },
                        'Создать ветку'
                    )
                );
                return;
            }

            // Если это шаг → создаём Step с branchId ветки
            if (STEP_FLOW_TYPES.has(type)) {
                // Получаем созданный DTO
                const nodes = rf.getNodes();
                const node = nodes.find(n => n.id === id);
                if (!node) return;

                const stepDto = (node.data as any).object;
                if (!stepDto) return;

                // Обновляем позицию и branchId в DTO
                const step = {
                    ...stepDto,
                    id: id as Guid,
                    branchId: target.id as Guid,
                    x: drop.x,
                    y: drop.y,
                };

                commandDispatcher.execute(
                    StepCommands.create(
                        activeId,
                        { step, branchId: target.id as Guid },
                        `Создать шаг "${step.name ?? type}"`
                    )
                );
            }
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    return (
        <div className={styles.rightPanelContainer}>
            <div
                onMouseDown={startCreateNode(FlowType.ActivityModbus)}
                className={`${styles.activityModbusBtnAdd} ${styles.btn}`}
            >
                Действие с modbus устр.
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.ActivitySystem)}
                className={`${styles.activitySystemBtnAdd} ${styles.btn}`}
            >
                Системное действие
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.BranchNode)}
                className={`${styles.branchBtnAdd} ${styles.btn}`}
            >
                <span>Новая</span> ветка
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.Parallel)}
                className={`${styles.parallelBtnAdd} ${styles.btn}`}
            >
                Параллел. шаг
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.Condition)}
                className={`${styles.conditionBtnAdd} ${styles.btn}`}
            >
                Условие
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.Delay)}
                className={`${styles.delayBtnAdd} ${styles.btn}`}
            >
                Время ожидания
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.Jump)}
                className={`${styles.jumpBtnAdd} ${styles.btn}`}
            >
                Переход
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.Signal)}
                className={`${styles.signalBtnAdd} ${styles.btn}`}
            >
                Сигнал
            </div>
        </div>
    );
};