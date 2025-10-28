// src/features/scenarioEditor/core/ui/map/RightPanel/RightPanel.tsx

import styles from "./NewNodesPanel.module.css";
import React, { useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import {
    commitDropToBranch,
    getAll,
    pickDeepestBranchByTopLeft,
    setHoverBranch
} from "@scenario/core/utils/dropUtils.ts";
import {
    ConditionStepDto,
    DelayStepDto,
    JumpStepDto,
    ActivityModbusStepDto,
    ParallelStepDto,
    SignalStepDto,
    ActivitySystemStepDto
} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import { BranchDto } from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto.ts";
import { FlowType } from "@scenario/core/ui/nodes/types/flowType.ts";
import type { FlowNode } from "@scenario/shared/contracts/models/FlowNode.ts";
import type { FlowNodeData } from "@scenario/shared/contracts/models/FlowNodeData.ts";
import { useSelector } from "react-redux";
import { selectActiveScenarioId } from "@scenario/store/scenarioSelectors.ts";
import type { Guid } from "@app/lib/types/Guid.ts";
import { useScenarioOperations } from "@scenario/core/hooks/useScenarioOperations.ts";
import { useScenarioValidation } from "@scenario/core/features/validation/useScenarioValidation.ts";

function createByFlowType(type: FlowType, p: any) {
    switch (type) {
        case FlowType.ActivityModbus:  return ActivityModbusStepDto.create(p);
        case FlowType.ActivitySystem:  return ActivitySystemStepDto.create(p);
        case FlowType.Delay:       return DelayStepDto.create(p);
        case FlowType.Signal:      return SignalStepDto.create(p);
        case FlowType.Jump:        return JumpStepDto.create(p);
        case FlowType.Parallel:    return ParallelStepDto.create(p);
        case FlowType.Condition:   return ConditionStepDto.create(p);
        case FlowType.BranchNode:  return BranchDto.create(p);
        default:
            throw new Error(`FlowType ${type} не является шагом (или не поддержан)`);
    }
}

const STEP_FLOW_TYPES: Set<FlowType> = new Set<FlowType>([
    FlowType.ActivityModbus,
    FlowType.ActivitySystem,
    FlowType.Delay,
    FlowType.Signal,
    FlowType.Jump,
    FlowType.Parallel,
    FlowType.Condition,
]);

export const NewNodesPanel: React.FC = () => {
    const rf = useReactFlow<FlowNode>();
    const activeId = useSelector(selectActiveScenarioId);

    //  Хук для операций со сценарием
    const operations = useScenarioOperations(activeId);

    // ✅ ВАЛИДАЦИЯ: Проверяем, есть ли невалидные ноды
    const validation = useScenarioValidation(activeId);

    const hoverBranchIdRef = useRef<string | null>(null);

    const setHover = (id: string | null) => {
        if (hoverBranchIdRef.current === id) return;
        hoverBranchIdRef.current = id;
        setHoverBranch(rf.setNodes as any, id);
    };

    const startCreateNode = (type: FlowType) => (e: React.MouseEvent) => {
        e.preventDefault();

        // ✅ ВАЛИДАЦИЯ: Блокируем создание новых нод, если есть невалидные
        if (validation.hasInvalidNodes) {
            console.warn('[NewNodesPanel] Cannot create node: scenario has invalid nodes', validation.invalidNodes);

            // Формируем сообщение с перечислением невалидных нод
            const invalidNodesList = validation.invalidNodes
                .map(node => `- "${node.nodeName}": ${node.errors.join(', ')}`)
                .join('\n');

            alert(
                `Невозможно создать новую ноду!\n\n` +
                `Сначала заполните данные в существующих нодах:\n\n${invalidNodesList}`
            );

            return;
        }

        const id = crypto.randomUUID();

        const move = (ev: MouseEvent) => {
            const pos = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });

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
                                    ...n.data,
                                    x: pos.x,
                                    y: pos.y,
                                } as FlowNodeData,
                            }
                            : n
                    );
                }

                const object = createByFlowType(type, { id });

                const newNode: FlowNode = {
                    id,
                    type,
                    position: pos,
                    data: {
                        object,
                        x: pos.x,
                        y: pos.y,
                        __persisted: false,
                    } as FlowNodeData,
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

            setHover(null);

            if (!target) {
                rf.setNodes((nds) => nds.filter((n) => n.id !== id));
                return;
            }

            commitDropToBranch(rf.setNodes as any, all, target, id, drop, true);

            rf.setNodes((nds) =>
                nds.map(n => n.id === id ? { ...n, data: { ...n.data, __persisted: true } } : n)
            );

            //  Получаем созданную ноду
            const nodes = rf.getNodes();
            const createdNode = nodes.find(n => n.id === id);
            if (!createdNode || !activeId) {
                console.error('[RightPanel] Created node not found or no activeId');
                return;
            }

            //  Создаём финальный DTO
            let finalDto = createdNode.data.object;

            if (type === FlowType.BranchNode) {
                finalDto = {
                    ...finalDto,
                    id: id as Guid,
                    scenarioId: activeId,
                    x: drop.x,
                    y: drop.y,
                    width: 300,
                    height: 100,
                } as BranchDto;
            } else if (STEP_FLOW_TYPES.has(type)) {
                finalDto = {
                    ...finalDto,
                    id: id as Guid,
                    branchId: target.id as Guid,
                    x: drop.x,
                    y: drop.y,
                    width: 100,
                    height: 71,
                } as any; // Cast to any для избежания ошибок типизации
            }

            //  Обновляем ноду с финальным DTO
            rf.setNodes((nds) =>
                nds.map(n =>
                    n.id === id
? {
                            ...n,
                            data: {
                                ...n.data,
                                object: finalDto,
                            },
                        }
                        : n
                )
            );

            // ИСПРАВЛЕНИЕ: Создаем finalNode вручную вместо получения из rf.getNodes()
            // rf.getNodes() может вернуть старое состояние из-за асинхронности React
            const finalNode: FlowNode = {
                id,
                type,
                position: drop,
                data: {
                    object: finalDto,
                    x: drop.x,
                    y: drop.y,
                    __persisted: true,
                },
                draggable: true,
                selectable: true,
            };

            //  Вызываем createNode из operations (аналог moveNode в ScenarioMap)
            operations.createNode(finalNode);

            console.log(`[RightPanel]  Created ${type}: ${id}`, { target: target.id, drop, branchId: (finalDto as any).branchId });
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