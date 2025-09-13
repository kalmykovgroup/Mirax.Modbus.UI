// src/app/scenario-designer/graph/connectionRules.ts

import { FlowType } from "@/features/scenarioEditor/shared/contracts/types/FlowType";

type Rules = Partial<Record<FlowType, ReadonlySet<FlowType>>>;

/** Источник → допустимые цели */
export const ALLOW_MAP: Rules = {
    // jump ->
    [FlowType.jumpStepNode]: new Set<FlowType>([
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
        FlowType.parallelStepNode,
        FlowType.delayStepNode,
        FlowType.jumpStepNode,
        FlowType.signalStepNode,
        FlowType.conditionStepNode,
    ]),

    // condition ->
    [FlowType.conditionStepNode]: new Set<FlowType>([
        FlowType.branchNode,
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
        FlowType.parallelStepNode,
        FlowType.delayStepNode,
        FlowType.jumpStepNode,
        FlowType.signalStepNode,
        FlowType.conditionStepNode,
    ]),

    // parallel ->
    [FlowType.parallelStepNode]: new Set<FlowType>([
        FlowType.branchNode,
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
        FlowType.parallelStepNode,
        FlowType.delayStepNode,
        FlowType.jumpStepNode,
        FlowType.signalStepNode,
        FlowType.conditionStepNode,
    ]),

    // system ->
    [FlowType.activitySystemNode]: new Set<FlowType>([
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
        FlowType.parallelStepNode,
        FlowType.delayStepNode,
        FlowType.jumpStepNode,
        FlowType.signalStepNode,
        FlowType.conditionStepNode,
    ]),

    // modbus ->
    [FlowType.activityModbusNode]: new Set<FlowType>([
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
        FlowType.parallelStepNode,
        FlowType.delayStepNode,
        FlowType.jumpStepNode,
        FlowType.signalStepNode,
        FlowType.conditionStepNode,
    ]),

    // delay ->
    [FlowType.delayStepNode]: new Set<FlowType>([
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
        FlowType.parallelStepNode,
        FlowType.delayStepNode,
        FlowType.jumpStepNode,
        FlowType.signalStepNode,
        FlowType.conditionStepNode,
    ]),


    // signal ->
    [FlowType.signalStepNode]: new Set<FlowType>([
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
        FlowType.parallelStepNode,
        FlowType.delayStepNode,
        FlowType.jumpStepNode,
        FlowType.signalStepNode,
        FlowType.conditionStepNode,
    ]),

    // при необходимости добавляй остальные источники
} as const;

/** Цель ← допустимые источники (строим автоматически из ALLOW_MAP) */
export const TARGET_ALLOW_MAP: Rules = (() => {
    const res: Partial<Record<FlowType, Set<FlowType>>> = {};
    (Object.keys(ALLOW_MAP) as FlowType[]).forEach((src) => {
        const targets = ALLOW_MAP[src]!;
        targets.forEach((tgt) => {
            if (!res[tgt]) res[tgt] = new Set<FlowType>();
            res[tgt]!.add(src);
        });
    });
    // приводим к ReadonlySet в типах
    return res as Rules;
})();


