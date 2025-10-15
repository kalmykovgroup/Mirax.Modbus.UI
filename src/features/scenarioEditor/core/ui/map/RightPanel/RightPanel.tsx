import styles from "./RightPanel.module.css";
import React, {useMemo, useRef} from "react";
import {useReactFlow} from "@xyflow/react";
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
    ModbusActivityStepDto,
    ParallelStepDto,
    SignalStepDto,
    SystemActivityStepDto
} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Steps/StepBaseDto.ts";
import {BranchDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/Branch/BranchDto.ts";
import {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import type {FlowNode} from "@/features/scenarioEditor/shared/contracts/models/FlowNode.ts";
import type {StepNodeData} from "@/features/scenarioEditor/shared/contracts/models/StepNodeData.ts";

// NEW: сценарий, операции, типы
import {useSelector} from "react-redux";
import {selectActiveScenarioId} from "@/features/scenarioEditor/store/scenarioSlice.ts";
import {ScenarioChangeCenter} from "@scenario/core/ScenarioChangeCenter.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {ScenarioOperationDto} from "@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScenarioOperationDto.ts";
import {DbEntityType} from "@shared/contracts/Types/Api.Shared/Scenario/DbEntityType.ts";
import {DbActionType} from "@shared/contracts/Types/Api.Shared/Scenario/DbActionType.ts";

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

// какие flow-типами считаем «шагами» для Create Step
const STEP_FLOW_TYPES: Set<FlowType> = new Set<FlowType>([
    FlowType.activityModbusNode,
    FlowType.activitySystemNode,
    FlowType.delayStepNode,
    FlowType.signalStepNode,
    FlowType.jumpStepNode,
    FlowType.parallelStepNode,
    FlowType.conditionStepNode,
]);

export const RightPanel = () => {
    const rf = useReactFlow<FlowNode>();
    const activeId = useSelector(selectActiveScenarioId);

    // NEW: change center и генератор guid
    const changeCenter = useMemo(
        () => (activeId ? new ScenarioChangeCenter(activeId) : null),
        [activeId]
    );
    const makeGuid = () => (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as Guid;

    const hoverBranchIdRef = useRef<string | null>(null);

    const setHover = (id: string | null) => {
        if (hoverBranchIdRef.current === id) return;
        hoverBranchIdRef.current = id;
        setHoverBranch(rf.setNodes as any, id); // тип совпадает: (updater) => void
    };

    const startCreateNode = (type: FlowType) => (e: React.MouseEvent) => {
        e.preventDefault();
        const id = crypto.randomUUID();

        const move = (ev: MouseEvent) => {
            const pos = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });

            // подсветка цели — тот же алгоритм
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

                // создаём DTO для shared.object (как и раньше)
                const object = createByFlowType(type, { id }); // по возможности пробрасываем id внутрь dto

                const newNode: FlowNode = {
                    id,
                    type,
                    position: pos,         // абсолютные координаты (в RF)
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

            // снять подсветку
            setHover(null);

            if (!target) {
                // Без ветки: визуально — как было; операции не шлём (строгая политика «всегда внутри ветки»
                // может быть включена позднее: тогда просто удаляйте временную ноду и не создавайте оп).
                return;
            }

            // единый коммит в граф (как раньше)
            commitDropToBranch(rf.setNodes as any, all, target, id, drop, /*growBranch*/ true);

            rf.setNodes((nds) =>
                nds.map(n => n.id === id ? { ...n, data: { ...n.data, __persisted: true } } : n)
            );
            // NEW: шлём операцию в центр изменений
            if (!changeCenter) return;

            // Если это ветка → создаём Branch
            if (type === FlowType.branchNode) {
                const width  = 300;
                const height = 100;

                const op: ScenarioOperationDto = {
                    opId: makeGuid(),
                    entity: DbEntityType.Branch,
                    action: DbActionType.Create,
                    payload: {
                        id: id as Guid,
                        // абсолютные координаты места дропа
                        x: drop.x,
                        y: drop.y,
                        width,
                        height
                    }
                };
                changeCenter.create(op);
                return;
            }

            // Если это шаг → создаём Step с branchId ветки + абсолютные координаты
            if (STEP_FLOW_TYPES.has(type)) {
                const op: ScenarioOperationDto = {
                    opId: makeGuid(),
                    entity: DbEntityType.Step,
                    action: DbActionType.Create,
                    payload: {
                        id: id as Guid,
                        branchId: target.id as Guid,
                        x: drop.x,
                        y: drop.y,
                        // Можно передать тип шага, если серверу нужно отличать:
                        // flowType: type
                    }
                };
                changeCenter.create(op);
            }
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    return (
        <div className={styles.rightPanelContainer}>
            <div onMouseDown={startCreateNode(FlowType.activityModbusNode)} className={`${styles.activityModbusBtnAdd} ${styles.btn}`}>Действие с modbus устр.</div>
            <div onMouseDown={startCreateNode(FlowType.activitySystemNode)} className={`${styles.activitySystemBtnAdd} ${styles.btn}`}>Системное действие</div>
            <div onMouseDown={startCreateNode(FlowType.branchNode)} className={`${styles.branchBtnAdd} ${styles.btn}`}><span>Новая</span> ветка</div>
            <div onMouseDown={startCreateNode(FlowType.parallelStepNode)} className={`${styles.parallelBtnAdd} ${styles.btn}`}>Параллел. шаг</div>
            <div onMouseDown={startCreateNode(FlowType.conditionStepNode)} className={`${styles.conditionBtnAdd} ${styles.btn}`}>Условие</div>
            <div onMouseDown={startCreateNode(FlowType.delayStepNode)} className={`${styles.delayBtnAdd} ${styles.btn}`}>Время ожидания</div>
            <div onMouseDown={startCreateNode(FlowType.jumpStepNode)} className={`${styles.jumpBtnAdd} ${styles.btn}`}>Переход</div>
            <div onMouseDown={startCreateNode(FlowType.signalStepNode)} className={`${styles.signalBtnAdd} ${styles.btn}`}>Сигнал</div>
        </div>
    );
};
