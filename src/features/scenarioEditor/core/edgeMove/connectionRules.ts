// src/app/scenario-designer/graph/connectionRules.ts

import { FlowType } from "@scenario/core/ui/nodes/types/flowType.ts";

type Rules = Partial<Record<FlowType, ReadonlySet<FlowType>>>;

/** Источник → допустимые цели */
export const ALLOW_MAP: Rules = {
    // jump ->
    [FlowType.Jump]: new Set<FlowType>([
        FlowType.ActivitySystem,
        FlowType.ActivityModbus,
        FlowType.Parallel,
        FlowType.Delay,
        FlowType.Jump,
        FlowType.Signal,
        FlowType.Condition,
    ]),

    // condition ->
    [FlowType.Condition]: new Set<FlowType>([
        FlowType.BranchNode,
        FlowType.ActivitySystem,
        FlowType.ActivityModbus,
        FlowType.Parallel,
        FlowType.Delay,
        FlowType.Jump,
        FlowType.Signal,
        FlowType.Condition,
    ]),

    // parallel ->
    [FlowType.Parallel]: new Set<FlowType>([
        FlowType.BranchNode,
        FlowType.ActivitySystem,
        FlowType.ActivityModbus,
        FlowType.Parallel,
        FlowType.Delay,
        FlowType.Jump,
        FlowType.Signal,
        FlowType.Condition,
    ]),

    // system ->
    [FlowType.ActivitySystem]: new Set<FlowType>([
        FlowType.ActivitySystem,
        FlowType.ActivityModbus,
        FlowType.Parallel,
        FlowType.Delay,
        FlowType.Jump,
        FlowType.Signal,
        FlowType.Condition,
    ]),

    // modbus ->
    [FlowType.ActivityModbus]: new Set<FlowType>([
        FlowType.ActivitySystem,
        FlowType.ActivityModbus,
        FlowType.Parallel,
        FlowType.Delay,
        FlowType.Jump,
        FlowType.Signal,
        FlowType.Condition,
    ]),

    // delay ->
    [FlowType.Delay]: new Set<FlowType>([
        FlowType.ActivitySystem,
        FlowType.ActivityModbus,
        FlowType.Parallel,
        FlowType.Delay,
        FlowType.Jump,
        FlowType.Signal,
        FlowType.Condition,
    ]),


    // signal ->
    [FlowType.Signal]: new Set<FlowType>([
        FlowType.ActivitySystem,
        FlowType.ActivityModbus,
        FlowType.Parallel,
        FlowType.Delay,
        FlowType.Jump,
        FlowType.Signal,
        FlowType.Condition,
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


