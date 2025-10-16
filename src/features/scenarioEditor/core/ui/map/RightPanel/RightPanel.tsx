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
    ModbusActivityStepDto,
    ParallelStepDto,
    SignalStepDto,
    SystemActivityStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto";
import { BranchDto } from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto";
import { FlowType } from "@/features/scenarioEditor/shared/contracts/types/FlowType";
import type { FlowNode } from "@/features/scenarioEditor/shared/contracts/models/FlowNode";
import type { StepNodeData } from "@/features/scenarioEditor/shared/contracts/models/StepNodeData";

// ⚡ NEW: Командная система (заменяет ScenarioChangeCenter)
import { useSelector } from "react-redux";
import { selectActiveScenarioId } from "@scenario/store/scenarioSelectors";
import type { Guid } from "@app/lib/types/Guid";
import {useCommandDispatcher} from "@scenario/core/features/scenarioChangeCenter/useCommandDispatcher.ts";
import {BranchCommands, StepCommands} from "@scenario/core/features/scenarioChangeCenter/commandBuilders.ts";

function createByFlowType(type: FlowType, p: any) {
    switch (type) {
        case FlowType.activityModbusNode:  return ModbusActivityStepDto.create(p);
        case FlowType.activitySystemNode:  return SystemActivityStepDto.create(p);
        case FlowType.delayStepNode:       return DelayStepDto.create(p);
        case FlowType.signalStepNode:      return SignalStepDto.create(p);
        case FlowType.jumpStepNode:        return JumpStepDto.create(p);
        case FlowType.parallelStepNode:    return ParallelStepDto.create(p);
        case FlowType.conditionStepNode:   return ConditionStepDto.create(p);
        case FlowType.branchNode:          return BranchDto.create(p);
        default:
            throw new Error(`FlowType ${type} не является шагом (или не поддержан)`);
    }
}

// Какие flow-типами считаем «шагами» для Create Step
const STEP_FLOW_TYPES: Set<FlowType> = new Set<FlowType>([
    FlowType.activityModbusNode,
    FlowType.activitySystemNode,
    FlowType.delayStepNode,
    FlowType.signalStepNode,
    FlowType.jumpStepNode,
    FlowType.parallelStepNode,
    FlowType.conditionStepNode,
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
                                } as StepNodeData<object>,
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
                    } as StepNodeData<object>,
                    draggable: true,
                    selectable: true,
                    ...(type === FlowType.branchNode
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
            if (type === FlowType.branchNode) {
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
                onMouseDown={startCreateNode(FlowType.activityModbusNode)}
                className={`${styles.activityModbusBtnAdd} ${styles.btn}`}
            >
                Действие с modbus устр.
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.activitySystemNode)}
                className={`${styles.activitySystemBtnAdd} ${styles.btn}`}
            >
                Системное действие
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.branchNode)}
                className={`${styles.branchBtnAdd} ${styles.btn}`}
            >
                <span>Новая</span> ветка
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.parallelStepNode)}
                className={`${styles.parallelBtnAdd} ${styles.btn}`}
            >
                Параллел. шаг
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.conditionStepNode)}
                className={`${styles.conditionBtnAdd} ${styles.btn}`}
            >
                Условие
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.delayStepNode)}
                className={`${styles.delayBtnAdd} ${styles.btn}`}
            >
                Время ожидания
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.jumpStepNode)}
                className={`${styles.jumpBtnAdd} ${styles.btn}`}
            >
                Переход
            </div>
            <div
                onMouseDown={startCreateNode(FlowType.signalStepNode)}
                className={`${styles.signalBtnAdd} ${styles.btn}`}
            >
                Сигнал
            </div>
        </div>
    );
};