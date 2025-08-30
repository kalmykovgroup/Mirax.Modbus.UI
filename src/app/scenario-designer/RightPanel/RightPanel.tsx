import styles from "./RightPanel.module.css";
import { type FlowNode } from "@app/scenario-designer/types/FlowNode.ts";
import React, {useRef} from "react";
import {useReactFlow} from "@xyflow/react";
import {
    commitDropToBranch,
    getAll,
    pickDeepestBranchByTopLeft,
    setHoverBranch
} from "@app/scenario-designer/graph/dropUtils.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import type {StepNodeData} from "@app/scenario-designer/types/StepNodeData.ts";
import {
    ConditionStepDto,
    DelayStepDto, JumpStepDto,
    ModbusActivityStepDto, ParallelStepDto, SignalStepDto,
    SystemActivityStepDto
} from "@shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts";
import {BranchDto} from "@shared/contracts/Dtos/ScenarioDtos/Branch/BranchDto.ts";


export function createByFlowType(type: FlowType, p: any) {
    switch (type) {
        case FlowType.activityModbusNode:  return ModbusActivityStepDto.create(p);
        case FlowType.activitySystemNode:  return SystemActivityStepDto.create(p);
        case FlowType.delayStepNode:       return DelayStepDto.create(p);
        case FlowType.signalNode:          return SignalStepDto.create(p);
        case FlowType.jumpStepNode:        return JumpStepDto.create(p);
        case FlowType.parallelStepNode:    return ParallelStepDto.create(p);
        case FlowType.conditionStepNode:   return ConditionStepDto.create(p);
        case FlowType.branchNode:          return BranchDto.create(p);
        default:
            throw new Error(`FlowType ${type} не является шагом (или не поддержан)`);
    }
}

export const RightPanel = () => {
    const rf = useReactFlow<FlowNode>();

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
            setHover(target?.id ?? null); // setHover должен дергать setHoverBranch(setNodes, ...)

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
                const object = createByFlowType(type, {

                })


                const newNode: FlowNode = {
                    id,
                    type,                  // FlowType
                    position: pos,         // top-left = курсор
                    data: {
                        object: object
                    },                  // StepNodeData<object>
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

            if (!target) return; // остаётся на поле
            // единый коммит (тот же, что и при обычном перетаскивании)
            commitDropToBranch(rf.setNodes as any, all, target, id, drop, /*growBranch*/ true);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    return (
        <div className={styles.container}>
            <div onMouseDown={startCreateNode(FlowType.activityModbusNode)} className={`${styles.activityModbusBtnAdd} ${styles.btn}`}>Действие с modbus устр.</div>
            <div onMouseDown={startCreateNode(FlowType.activitySystemNode)} className={`${styles.activitySystemBtnAdd} ${styles.btn}`}>Системное действие</div>
            <div onMouseDown={startCreateNode(FlowType.branchNode)} className={`${styles.branchBtnAdd} ${styles.btn}`}><span>Новая</span> ветка</div>
            <div onMouseDown={startCreateNode(FlowType.parallelStepNode)} className={`${styles.parallelBtnAdd} ${styles.btn}`}>Параллел. шаг</div>
            <div onMouseDown={startCreateNode(FlowType.conditionStepNode)} className={`${styles.conditionBtnAdd} ${styles.btn}`}>Условие</div>
            <div onMouseDown={startCreateNode(FlowType.delayStepNode)} className={`${styles.delayBtnAdd} ${styles.btn}`}>Время ожидания</div>
            <div onMouseDown={startCreateNode(FlowType.jumpStepNode)} className={`${styles.jumpBtnAdd} ${styles.btn}`}>Переход</div>
            <div onMouseDown={startCreateNode(FlowType.signalNode)} className={`${styles.signalBtnAdd} ${styles.btn}`}>Сигнал</div>
        </div>
    );
};
